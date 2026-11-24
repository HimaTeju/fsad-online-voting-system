from typing import Optional, List
from app.schemas.common import CamelModel, CamelResponse


class CastVoteRequest(CamelModel):
    election_id: int
    candidate_id: int


class BoothResultEntry(CamelModel):
    candidate_id: int
    manual_booth_votes: int


class ManualBoothResultRequest(CamelModel):
    results: List[BoothResultEntry]


class CandidateResult(CamelResponse):
    candidate_id: int
    candidate_name: Optional[str]
    party_name: Optional[str]
    online_votes: int
    manual_booth_votes: int
    total_votes: int
    winner: bool = False


class ElectionResultResponse(CamelResponse):
    election_id: int
    election_title: Optional[str]
    finalized: bool
    results: List[CandidateResult]


class CandidateStat(CamelResponse):
    candidate_id: int
    candidate_name: Optional[str]
    party_name: Optional[str]
    vote_count: int


class VoteStatsResponse(CamelResponse):
    election_id: int
    total_votes: int
    candidates: List[CandidateStat]
