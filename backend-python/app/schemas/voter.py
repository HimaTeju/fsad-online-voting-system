from datetime import date
from typing import Optional
from pydantic import Field, field_validator
from app.models.enums import Gender, ApplicationStatus
from app.schemas.common import CamelModel, CamelResponse


class VoterIdApplicationRequest(CamelModel):
    full_name: str = Field(max_length=150)
    date_of_birth: date
    gender: Gender
    address: str
    pincode: str = Field(pattern=r"^\d{6}$")
    photo_url: Optional[str] = Field(None, max_length=500)
    national_id: str = Field(pattern=r"^\d{12}$", max_length=12)

    @field_validator("date_of_birth")
    @classmethod
    def dob_must_be_in_past(cls, v: date) -> date:
        from datetime import date as dt
        if v >= dt.today():
            raise ValueError("Date of birth must be in the past")
        return v


class ApplicationReviewRequest(CamelModel):
    approved: bool
    remarks: Optional[str] = None


class ApplicationVerifyRequest(CamelModel):
    is_physical_verified: bool


class ApplicationResponse(CamelResponse):
    id: int
    full_name: str
    date_of_birth: Optional[date]
    gender: Optional[Gender]
    address: Optional[str]
    constituency_name: Optional[str] = None
    photo_url: Optional[str]
    national_id: str
    status: ApplicationStatus
    remarks: Optional[str]
    is_physical_verified: bool = False
    submitted_at: Optional[object]
    reviewed_at: Optional[object]


class VoterListItem(CamelResponse):
    id: int
    full_name: str
    email: str
    voter_id_number: Optional[str] = None
    gender: Optional[Gender] = None
    address: Optional[str] = None
    date_of_birth: Optional[date] = None


class VoterProfileResponse(CamelResponse):
    id: int
    voter_id_number: str
    constituency_id: int
    constituency_name: Optional[str] = None
    gender: Optional[Gender]
    address: Optional[str]
    photo_url: Optional[str]
