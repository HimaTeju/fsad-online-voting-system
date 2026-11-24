from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError

from app.models.vote import Vote
from app.models.candidate import Candidate
from app.models.election import Election
from app.models.voter_profile import VoterProfile
from app.models.enums import ElectionStatus, NominationStatus
from app.schemas.result import CastVoteRequest, VoteStatsResponse, CandidateStat
from app.utils.voter_token import compute_voter_token


def cast_vote(
    req: CastVoteRequest, user_id: int, db: Session, background_tasks
) -> dict:
    election = db.query(Election).filter(Election.id == req.election_id).first()
    if not election:
        raise HTTPException(404, "Election not found")
    if election.status != ElectionStatus.VOTING_OPEN:
        raise HTTPException(400, "Election is not open for voting")

    profile = db.query(VoterProfile).filter(VoterProfile.user_id == user_id).first()
    if not profile:
        raise HTTPException(400, "Voter profile not found. Please apply for voter ID first.")

    candidate = db.query(Candidate).filter(Candidate.id == req.candidate_id).first()
    if not candidate or candidate.nomination_status != NominationStatus.APPROVED:
        raise HTTPException(400, "Invalid or unapproved candidate")

    # Constituency check for non-national elections
    if election.constituency_id and profile.constituency_id != election.constituency_id:
        raise HTTPException(403, "Voter constituency does not match election constituency")

    token_hash = compute_voter_token(profile.id, election.id, election.vote_salt)

    if db.query(Vote).filter(
        Vote.voter_token_hash == token_hash, Vote.election_id == election.id
    ).first():
        raise HTTPException(409, "You have already voted in this election")

    vote = Vote(
        election_id=election.id,
        candidate_id=candidate.id,
        constituency_id=profile.constituency_id,
        voter_token_hash=token_hash,
    )
    try:
        db.add(vote)
        candidate.online_vote_count = (candidate.online_vote_count or 0) + 1
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "You have already voted in this election")

    # Broadcast live stats
    from app.services.websocket_broadcast import broadcast_vote_stats
    background_tasks.add_task(broadcast_vote_stats, election.id, db)

    # Send confirmation email + notification
    user = profile.user
    from app.services.email_service import send_vote_confirmation
    background_tasks.add_task(send_vote_confirmation, user.email, user.full_name, election.title)

    from app.services.notification_service import create_notification
    from app.models.enums import NotificationType
    background_tasks.add_task(
        create_notification,
        db,
        recipient_id=user_id,
        sender_id=None,
        type_=NotificationType.VOTE_CONFIRMATION,
        title="Vote Cast Successfully",
        body=f"Your vote for {election.title} has been recorded.",
    )

    return {"message": "Vote cast successfully"}


def has_voted(user_id: int, election_id: int, db: Session) -> bool:
    election = db.query(Election).filter(Election.id == election_id).first()
    if not election:
        raise HTTPException(404, "Election not found")
    profile = db.query(VoterProfile).filter(VoterProfile.user_id == user_id).first()
    if not profile:
        return False
    token_hash = compute_voter_token(profile.id, election.id, election.vote_salt)
    return db.query(Vote).filter(
        Vote.voter_token_hash == token_hash, Vote.election_id == election_id
    ).first() is not None


def get_live_stats(election_id: int, db: Session) -> VoteStatsResponse:
    from app.services.websocket_broadcast import build_stats
    return build_stats(election_id, db)
