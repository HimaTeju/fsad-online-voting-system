import secrets
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.candidate import Candidate
from app.models.election import Election
from app.models.enums import ElectionStatus, NominationStatus
from app.schemas.candidate import (
    CandidateNominationRequest,
    NominationReviewRequest,
    UpdateCandidateProfileRequest,
    CandidateResponse,
)
from app.security.passwords import hash_password


def _to_response(c: Candidate) -> CandidateResponse:
    return CandidateResponse(
        id=c.id,
        user_id=c.user_id,
        full_name=c.user.full_name if c.user else None,
        election_id=c.election_id,
        election_title=c.election.title if c.election else None,
        constituency_id=c.constituency_id,
        constituency_name=c.constituency.name if c.constituency else None,
        party_name=c.party_name,
        party_symbol_url=c.party_symbol_url,
        manifesto=c.manifesto,
        education=c.education,
        criminal_record=c.criminal_record,
        photo_url=c.photo_url,
        nomination_status=c.nomination_status,
        rejection_reason=c.rejection_reason,
        online_vote_count=c.online_vote_count,
    )


def check_nomination_target(election_id: int, constituency_id: int, db: Session) -> Election:
    """The election must be taking nominations, and a constituency election only
    accepts candidates for its own constituency."""
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(404, "Election not found")
    if election.status != ElectionStatus.NOMINATION_OPEN:
        raise HTTPException(400, "Election is not open for nominations")
    if election.constituency_id and constituency_id != election.constituency_id:
        raise HTTPException(400, "This election is only for its own constituency")
    return election


def nominate(req: CandidateNominationRequest, user_id: int, db: Session) -> CandidateResponse:
    check_nomination_target(req.election_id, req.constituency_id, db)
    if db.query(Candidate).filter(
        Candidate.user_id == user_id, Candidate.election_id == req.election_id
    ).first():
        raise HTTPException(409, "Already nominated for this election")

    candidate = Candidate(
        user_id=user_id,
        election_id=req.election_id,
        constituency_id=req.constituency_id,
        party_name=req.party_name,
        party_symbol_url=req.party_symbol_url,
        manifesto=req.manifesto,
        education=req.education,
        criminal_record=req.criminal_record,
        photo_url=req.photo_url,
        nomination_status=NominationStatus.SUBMITTED,
    )
    db.add(candidate)
    db.commit()
    db.refresh(candidate)
    return _to_response(candidate)


def review_nomination(
    candidate_id: int, req: NominationReviewRequest, admin_id: int, db: Session, background_tasks
) -> CandidateResponse:
    candidate = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not candidate:
        raise HTTPException(404, "Candidate not found")
    if candidate.nomination_status != NominationStatus.SUBMITTED:
        raise HTTPException(409, f"Nomination has already been {candidate.nomination_status.value.lower()}")

    if req.approved:
        candidate.nomination_status = NominationStatus.APPROVED
        user = candidate.user
        if not user.email_verified:
            temp_password = secrets.token_urlsafe(12)
            user.password_hash = hash_password(temp_password)
            user.email_verified = True
            from app.services.email_service import send_candidate_credentials
            background_tasks.add_task(
                send_candidate_credentials, user.email, user.full_name, temp_password
            )
    else:
        candidate.nomination_status = NominationStatus.REJECTED
        candidate.rejection_reason = req.rejection_reason
        from app.services.email_service import send_nomination_status
        background_tasks.add_task(
            send_nomination_status,
            candidate.user.email,
            candidate.user.full_name,
            False,
            req.rejection_reason,
        )

    db.commit()
    db.refresh(candidate)
    return _to_response(candidate)


def update_profile(
    req: UpdateCandidateProfileRequest, user_id: int, db: Session
) -> CandidateResponse:
    candidate = db.query(Candidate).filter(
        Candidate.user_id == user_id,
        Candidate.nomination_status != NominationStatus.APPROVED,
    ).first()
    if not candidate:
        raise HTTPException(404, "No pending nomination found")
    for field, value in req.model_dump(exclude_unset=True).items():
        setattr(candidate, field, value)
    db.commit()
    db.refresh(candidate)
    return _to_response(candidate)


def get_approved_candidates(election_id: int, db: Session) -> list:
    candidates = db.query(Candidate).filter(
        Candidate.election_id == election_id,
        Candidate.nomination_status == NominationStatus.APPROVED,
    ).all()
    return [_to_response(c) for c in candidates]


def get_pending_nominations(db: Session, page: int = 0, size: int = 20) -> list:
    candidates = (
        db.query(Candidate)
        .filter(Candidate.nomination_status == NominationStatus.SUBMITTED)
        .offset(page * size)
        .limit(size)
        .all()
    )
    return [_to_response(c) for c in candidates]


def get_my_nominations(user_id: int, db: Session) -> list:
    candidates = db.query(Candidate).filter(Candidate.user_id == user_id).all()
    return [_to_response(c) for c in candidates]


def get_candidate(candidate_id: int, db: Session) -> CandidateResponse:
    c = db.query(Candidate).filter(Candidate.id == candidate_id).first()
    if not c:
        raise HTTPException(404, "Candidate not found")
    return _to_response(c)
