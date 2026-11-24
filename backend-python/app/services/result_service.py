from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.election_result import ElectionResult
from app.models.candidate import Candidate
from app.models.election import Election
from app.models.vote import Vote
from app.models.enums import ElectionStatus, NominationStatus
from app.schemas.result import (
    ManualBoothResultRequest,
    ElectionResultResponse,
    CandidateResult,
)


def enter_manual_results(
    election_id: int, req: ManualBoothResultRequest, admin_id: int, db: Session
) -> ElectionResultResponse:
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(404, "Election not found")
    if election.status not in (ElectionStatus.VOTING_CLOSED, ElectionStatus.RESULTS_DECLARED):
        raise HTTPException(400, "Election voting must be closed before entering results")
    if _is_finalized(election_id, db):
        raise HTTPException(409, "Results are finalised and can no longer be edited")

    valid_ids = {
        cid for (cid,) in db.query(Candidate.id).filter(
            Candidate.election_id == election_id,
            Candidate.nomination_status == NominationStatus.APPROVED,
        )
    }
    for entry in req.results:
        if entry.candidate_id not in valid_ids:
            raise HTTPException(400, f"Candidate {entry.candidate_id} is not standing in this election")
        if entry.manual_booth_votes < 0:
            raise HTTPException(400, "Booth vote counts cannot be negative")

    online_counts = dict(
        db.query(Vote.candidate_id, func.count(Vote.id))
        .filter(Vote.election_id == election_id)
        .group_by(Vote.candidate_id)
        .all()
    )

    for entry in req.results:
        result = db.query(ElectionResult).filter(
            ElectionResult.election_id == election_id,
            ElectionResult.candidate_id == entry.candidate_id,
        ).first()
        online = online_counts.get(entry.candidate_id, 0)
        if result:
            result.manual_booth_votes = entry.manual_booth_votes
            result.online_votes = online
        else:
            candidate = db.query(Candidate).filter(Candidate.id == entry.candidate_id).first()
            result = ElectionResult(
                election_id=election_id,
                candidate_id=entry.candidate_id,
                constituency_id=candidate.constituency_id if candidate else None,
                online_votes=online,
                manual_booth_votes=entry.manual_booth_votes,
                entered_by=admin_id,
            )
            db.add(result)
    db.commit()
    return get_results(election_id, db)


def finalize_results(election_id: int, admin_id: int, db: Session, background_tasks) -> ElectionResultResponse:
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(404, "Election not found")

    if _is_finalized(election_id, db):
        raise HTTPException(409, "Results are already finalised")
    if election.status != ElectionStatus.VOTING_CLOSED:
        raise HTTPException(400, "Voting must be closed before results can be finalised")

    # Make sure every approved candidate has a result row, so online-only
    # elections (no booth counts entered) are finalised too.
    existing = {
        cid for (cid,) in db.query(ElectionResult.candidate_id).filter(
            ElectionResult.election_id == election_id
        )
    }
    online_counts = dict(
        db.query(Vote.candidate_id, func.count(Vote.id))
        .filter(Vote.election_id == election_id)
        .group_by(Vote.candidate_id)
        .all()
    )
    for c in db.query(Candidate).filter(
        Candidate.election_id == election_id,
        Candidate.nomination_status == NominationStatus.APPROVED,
    ):
        if c.id not in existing:
            db.add(ElectionResult(
                election_id=election_id,
                candidate_id=c.id,
                constituency_id=c.constituency_id,
                online_votes=online_counts.get(c.id, 0),
                manual_booth_votes=0,
                entered_by=admin_id,
            ))
    db.flush()
    db.query(ElectionResult).filter(ElectionResult.election_id == election_id).update(
        {"finalized": True}
    )
    election.status = ElectionStatus.RESULTS_DECLARED
    db.commit()

    from app.services.websocket_broadcast import broadcast_vote_stats
    background_tasks.add_task(broadcast_vote_stats, election_id, db)
    background_tasks.add_task(_announce_results, election_id)
    return get_results(election_id, db)


def _is_finalized(election_id: int, db: Session) -> bool:
    return db.query(ElectionResult.id).filter(
        ElectionResult.election_id == election_id, ElectionResult.finalized == True  # noqa: E712
    ).first() is not None


def _announce_results(election_id: int) -> None:
    """Email the candidates and notify eligible voters in-app. Runs as a background task."""
    from app.database import SessionLocal
    from app.models.enums import NotificationType
    from app.models.voter_profile import VoterProfile
    from app.services.email_service import send_result_declared
    from app.services.notification_service import create_notification

    db = SessionLocal()
    try:
        election = db.query(Election).filter(Election.id == election_id).first()
        if not election:
            return
        title = f"Results declared: {election.title}"
        for c in db.query(Candidate).filter(Candidate.election_id == election_id):
            if c.user:
                send_result_declared(c.user.email, c.user.full_name, election.title)
        voters = db.query(VoterProfile)
        if election.constituency_id:
            voters = voters.filter(VoterProfile.constituency_id == election.constituency_id)
        for vp in voters:
            create_notification(
                db, recipient_id=vp.user_id, sender_id=None,
                type_=NotificationType.RESULT_DECLARED, title=title,
                body="The final results are now published.",
            )
    finally:
        db.close()


def get_results(election_id: int, db: Session) -> ElectionResultResponse:
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(404, "Election not found")

    db_results = (
        db.query(ElectionResult)
        .filter(ElectionResult.election_id == election_id)
        .all()
    )

    if db_results:
        finalized = any(r.finalized for r in db_results)
        max_total = max((r.total_votes for r in db_results), default=0)
        results = [
            CandidateResult(
                candidate_id=r.candidate_id,
                candidate_name=r.candidate.user.full_name if r.candidate and r.candidate.user else None,
                party_name=r.candidate.party_name if r.candidate else None,
                online_votes=r.online_votes,
                manual_booth_votes=r.manual_booth_votes,
                total_votes=r.total_votes,
                winner=(r.total_votes == max_total and max_total > 0),
            )
            for r in db_results
        ]
    else:
        # Online-only view from denormalized counter
        finalized = False
        candidates = db.query(Candidate).filter(
            Candidate.election_id == election_id,
            Candidate.nomination_status == NominationStatus.APPROVED,
        ).all()
        max_votes = max((c.online_vote_count for c in candidates), default=0)
        results = [
            CandidateResult(
                candidate_id=c.id,
                candidate_name=c.user.full_name if c.user else None,
                party_name=c.party_name,
                online_votes=c.online_vote_count,
                manual_booth_votes=0,
                total_votes=c.online_vote_count,
                winner=(c.online_vote_count == max_votes and max_votes > 0),
            )
            for c in candidates
        ]

    return ElectionResultResponse(
        election_id=election_id,
        election_title=election.title,
        finalized=finalized,
        results=results,
    )


# ── Booth results from CSV ──────────────────────────────────────────────────
#
# Not every vote is cast online: booth (paper/EVM) counts are uploaded by the
# Election Officer as a CSV and added to the online votes. Expected columns
# (header names are case-insensitive, extra columns are ignored):
#
#     booth,candidate_id,candidate_name,votes
#     Booth 1,1,Lakshmi Rao,120
#     Booth 1,2,Arjun Patil,95
#
# A row needs `booth`, `votes` and either `candidate_id` or `candidate_name`.
# Votes are summed per candidate across all booths, and the totals replace any
# booth votes entered before. Candidates missing from the file get 0.

def import_booth_csv(election_id: int, content: bytes, admin_id: int, db: Session) -> dict:
    import csv
    import io
    from app.schemas.result import BoothResultEntry

    try:
        text = content.decode("utf-8-sig")  # tolerate the BOM Excel adds
    except UnicodeDecodeError:
        raise HTTPException(400, "The file must be a UTF-8 CSV")

    reader = csv.DictReader(io.StringIO(text))
    headers = {(h or "").strip().lower(): h for h in (reader.fieldnames or [])}
    missing = {"booth", "votes"} - headers.keys()
    if missing or not ({"candidate_id", "candidate_name"} & headers.keys()):
        raise HTTPException(
            400,
            "CSV header must include booth, votes and candidate_id or candidate_name "
            f"(found: {', '.join(reader.fieldnames or []) or 'nothing'})",
        )

    candidates = db.query(Candidate).filter(
        Candidate.election_id == election_id,
        Candidate.nomination_status == NominationStatus.APPROVED,
    ).all()
    by_id = {c.id: c for c in candidates}
    by_name = {c.user.full_name.strip().lower(): c for c in candidates if c.user}

    def cell(row, name):
        key = headers.get(name)
        return (row.get(key) or "").strip() if key else ""

    totals = {c.id: 0 for c in candidates}
    booths, seen, errors, rows = set(), set(), [], 0
    for line_no, row in enumerate(reader, start=2):
        if not any((v or "").strip() for v in row.values()):
            continue  # skip blank lines
        rows += 1
        booth, cid, cname, votes = (cell(row, "booth"), cell(row, "candidate_id"),
                                    cell(row, "candidate_name"), cell(row, "votes"))
        if not booth:
            errors.append(f"Line {line_no}: booth is empty")
            continue
        candidate = None
        if cid:
            candidate = by_id.get(int(cid)) if cid.isdigit() else None
            if not candidate:
                errors.append(f"Line {line_no}: candidate_id {cid} is not a candidate in this election")
                continue
        elif cname:
            candidate = by_name.get(cname.lower())
            if not candidate:
                errors.append(f"Line {line_no}: no candidate named '{cname}' in this election")
                continue
        else:
            errors.append(f"Line {line_no}: candidate_id or candidate_name is required")
            continue
        if not votes.isdigit():
            errors.append(f"Line {line_no}: votes must be a whole number 0 or more (got '{votes}')")
            continue
        if (booth.lower(), candidate.id) in seen:
            errors.append(f"Line {line_no}: {booth} has more than one row for {candidate.user.full_name}")
            continue
        seen.add((booth.lower(), candidate.id))
        booths.add(booth.lower())
        totals[candidate.id] += int(votes)

    if errors:
        shown = errors[:10] + ([f"…and {len(errors) - 10} more"] if len(errors) > 10 else [])
        raise HTTPException(400, "The CSV has problems: " + "; ".join(shown))
    if rows == 0:
        raise HTTPException(400, "The CSV has no data rows")

    results = enter_manual_results(
        election_id,
        ManualBoothResultRequest(results=[
            BoothResultEntry(candidate_id=cid, manual_booth_votes=v) for cid, v in totals.items()
        ]),
        admin_id,
        db,
    )
    return {
        "booths": len(booths),
        "rows": rows,
        "boothVotes": sum(totals.values()),
        "results": results,
    }
