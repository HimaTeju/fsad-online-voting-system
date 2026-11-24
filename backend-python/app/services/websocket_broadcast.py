import asyncio
import json
from typing import Dict, Set
from fastapi import WebSocket
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.models.candidate import Candidate
from app.models.vote import Vote
from app.models.election import Election
from app.models.enums import NominationStatus
from app.schemas.result import VoteStatsResponse, CandidateStat

# room_id → set of active WebSocket connections
_rooms: Dict[str, Set[WebSocket]] = {}


def add_to_room(room_id: str, ws: WebSocket) -> None:
    _rooms.setdefault(room_id, set()).add(ws)


def remove_from_room(room_id: str, ws: WebSocket) -> None:
    if room_id in _rooms:
        _rooms[room_id].discard(ws)
        if not _rooms[room_id]:
            del _rooms[room_id]


async def broadcast_to_room(room_id: str, payload: dict) -> None:
    connections = list(_rooms.get(room_id, set()))
    if not connections:
        return
    message = json.dumps(payload)
    dead = []
    for ws in connections:
        try:
            await ws.send_text(message)
        except Exception:
            dead.append(ws)
    for ws in dead:
        remove_from_room(room_id, ws)


def build_stats(election_id: int, db: Session) -> VoteStatsResponse:
    vote_counts = dict(
        db.query(Vote.candidate_id, func.count(Vote.id))
        .filter(Vote.election_id == election_id)
        .group_by(Vote.candidate_id)
        .all()
    )
    candidates = db.query(Candidate).filter(
        Candidate.election_id == election_id,
        Candidate.nomination_status == NominationStatus.APPROVED,
    ).all()
    total = sum(vote_counts.values())
    candidate_stats = [
        CandidateStat(
            candidate_id=c.id,
            candidate_name=c.user.full_name if c.user else None,
            party_name=c.party_name,
            vote_count=vote_counts.get(c.id, 0),
        )
        for c in candidates
    ]
    return VoteStatsResponse(election_id=election_id, total_votes=total, candidates=candidate_stats)


def broadcast_vote_stats(election_id: int, db: Session) -> None:
    stats = build_stats(election_id, db)
    room_id = f"election-{election_id}"
    asyncio.run(broadcast_to_room(room_id, stats.model_dump()))
