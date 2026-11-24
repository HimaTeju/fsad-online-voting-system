from typing import Optional
from pydantic import Field
from app.models.enums import NominationStatus
from app.schemas.common import CamelModel, CamelResponse


class CandidateNominationRequest(CamelModel):
    election_id: int
    constituency_id: int
    party_name: Optional[str] = Field(None, max_length=150)
    party_symbol_url: Optional[str] = Field(None, max_length=500)
    manifesto: Optional[str] = None
    education: Optional[str] = Field(None, max_length=255)
    criminal_record: Optional[str] = None
    photo_url: Optional[str] = Field(None, max_length=500)


class NominationReviewRequest(CamelModel):
    approved: bool
    rejection_reason: Optional[str] = None


class UpdateCandidateProfileRequest(CamelModel):
    party_name: Optional[str] = Field(None, max_length=150)
    party_symbol_url: Optional[str] = Field(None, max_length=500)
    manifesto: Optional[str] = None
    education: Optional[str] = Field(None, max_length=255)
    criminal_record: Optional[str] = None
    photo_url: Optional[str] = Field(None, max_length=500)


class CandidateResponse(CamelResponse):
    id: int
    user_id: int
    full_name: Optional[str] = None
    election_id: int
    election_title: Optional[str] = None
    constituency_id: int
    constituency_name: Optional[str] = None
    party_name: Optional[str]
    party_symbol_url: Optional[str]
    manifesto: Optional[str]
    education: Optional[str]
    criminal_record: Optional[str]
    photo_url: Optional[str]
    nomination_status: NominationStatus
    rejection_reason: Optional[str]
    online_vote_count: int
