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

    db.query(ElectionResult).filter(ElectionResult.election_id == election_id).update(
        {"finalized": True}
    )
    election.status = ElectionStatus.RESULTS_DECLARED
    db.commit()

    from app.services.websocket_broadcast import broadcast_vote_stats
    background_tasks.add_task(broadcast_vote_stats, election_id, db)
    return get_results(election_id, db)


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
                name=r.candidate.user.full_name if r.candidate and r.candidate.user else None,
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
                name=c.user.full_name if c.user else None,
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
