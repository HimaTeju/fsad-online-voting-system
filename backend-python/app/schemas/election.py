from datetime import datetime
from typing import Optional
from pydantic import Field
from app.models.enums import ElectionStatus, ElectionType
from app.schemas.common import CamelModel, CamelResponse


class CreateElectionRequest(CamelModel):
    title: str = Field(max_length=255)
    description: Optional[str] = None
    election_type: ElectionType
    constituency_id: Optional[int] = None
    nomination_start: datetime
    nomination_end: datetime
    voting_start: datetime
    voting_end: datetime


class UpdateElectionStatusRequest(CamelModel):
    status: ElectionStatus


class ElectionResponse(CamelResponse):
    id: int
    title: str
    description: Optional[str]
    election_type: ElectionType
    constituency_id: Optional[int]
    constituency_name: Optional[str] = None
    status: ElectionStatus
    nomination_start: Optional[datetime]
    nomination_end: Optional[datetime]
    voting_start: Optional[datetime]
    voting_end: Optional[datetime]
    created_at: Optional[datetime]


class VoterElectionResponse(ElectionResponse):
    """An election as a voter sees it, with whether they've already voted in it."""
    has_voted: bool = False

