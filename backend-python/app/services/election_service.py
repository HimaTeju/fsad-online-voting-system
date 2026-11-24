import secrets
from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.election import Election
from app.models.enums import ElectionStatus
from app.schemas.election import CreateElectionRequest, UpdateElectionStatusRequest, ElectionResponse

ALLOWED_TRANSITIONS = {
    ElectionStatus.DRAFT: [ElectionStatus.NOMINATION_OPEN],
    ElectionStatus.NOMINATION_OPEN: [ElectionStatus.NOMINATION_CLOSED],
    ElectionStatus.NOMINATION_CLOSED: [ElectionStatus.VOTING_OPEN],
    ElectionStatus.VOTING_OPEN: [ElectionStatus.VOTING_CLOSED],
    ElectionStatus.VOTING_CLOSED: [ElectionStatus.RESULTS_DECLARED],
}


def _to_response(e: Election) -> ElectionResponse:
    return ElectionResponse(
        id=e.id,
        title=e.title,
        description=e.description,
        election_type=e.election_type,
        constituency_id=e.constituency_id,
        constituency_name=e.constituency.name if e.constituency else None,
        status=e.status,
        nomination_start=e.nomination_start,
        nomination_end=e.nomination_end,
        voting_start=e.voting_start,
        voting_end=e.voting_end,
        created_at=e.created_at,
    )


def create_election(req: CreateElectionRequest, admin_id: int, db: Session) -> ElectionResponse:
    if req.nomination_start >= req.nomination_end:
        raise HTTPException(400, "nomination_start must be before nomination_end")
    if req.nomination_end >= req.voting_start:
        raise HTTPException(400, "nomination_end must be before voting_start")
    if req.voting_start >= req.voting_end:
        raise HTTPException(400, "voting_start must be before voting_end")
    voting_end = req.voting_end if req.voting_end.tzinfo else req.voting_end.replace(tzinfo=timezone.utc)
    if voting_end <= datetime.now(timezone.utc):
        # The scheduler would immediately push a past election through every stage.
        raise HTTPException(400, "Voting end must be in the future")

    vote_salt = secrets.token_hex(32)
    election = Election(
        title=req.title,
        description=req.description,
        election_type=req.election_type,
        constituency_id=req.constituency_id,
        status=ElectionStatus.DRAFT,
        nomination_start=req.nomination_start,
        nomination_end=req.nomination_end,
        voting_start=req.voting_start,
        voting_end=req.voting_end,
        vote_salt=vote_salt,
        created_by=admin_id,
    )
    db.add(election)
    db.commit()
    db.refresh(election)
    return _to_response(election)


def update_status(
    election_id: int, req: UpdateElectionStatusRequest, admin_id: int, db: Session
) -> ElectionResponse:
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(404, "Election not found")
    if req.status == ElectionStatus.RESULTS_DECLARED:
        raise HTTPException(400, "Finalise the results from the results page to declare them")
    allowed = ALLOWED_TRANSITIONS.get(election.status, [])
    if req.status not in allowed:
        raise HTTPException(400, f"Cannot transition from {election.status} to {req.status}")
    election.status = req.status
    db.commit()
    db.refresh(election)
    return _to_response(election)


def get_election(election_id: int, db: Session) -> ElectionResponse:
    e = db.query(Election).filter(Election.id == election_id).first()
    if not e:
        raise HTTPException(404, "Election not found")
    return _to_response(e)


def list_elections(db: Session, page: int = 0, size: int = 20) -> list:
    elections = db.query(Election).offset(page * size).limit(size).all()
    return [_to_response(e) for e in elections]


def auto_transition_elections(db: Session) -> None:
    now = datetime.now(timezone.utc)
    # DRAFT → NOMINATION_OPEN when nomination_start is past
    for e in db.query(Election).filter(
        Election.status == ElectionStatus.DRAFT,
        Election.nomination_start <= now,
    ).all():
        e.status = ElectionStatus.NOMINATION_OPEN

    # NOMINATION_OPEN → NOMINATION_CLOSED when nomination_end is past
    for e in db.query(Election).filter(
        Election.status == ElectionStatus.NOMINATION_OPEN,
        Election.nomination_end <= now,
    ).all():
        e.status = ElectionStatus.NOMINATION_CLOSED

    # NOMINATION_CLOSED → VOTING_OPEN when voting_start is past
    for e in db.query(Election).filter(
        Election.status == ElectionStatus.NOMINATION_CLOSED,
        Election.voting_start <= now,
    ).all():
        e.status = ElectionStatus.VOTING_OPEN

    # VOTING_OPEN → VOTING_CLOSED when voting_end is past
    for e in db.query(Election).filter(
        Election.status == ElectionStatus.VOTING_OPEN,
        Election.voting_end <= now,
    ).all():
        e.status = ElectionStatus.VOTING_CLOSED

    db.commit()
