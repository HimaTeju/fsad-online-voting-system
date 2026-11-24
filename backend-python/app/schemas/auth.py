from typing import Optional
from pydantic import EmailStr, Field
from app.models.enums import Role
from app.schemas.common import CamelModel, CamelResponse


class RegisterRequest(CamelModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=100)
    full_name: str = Field(max_length=150)
    phone: Optional[str] = Field(None, max_length=20)


class LoginRequest(CamelModel):
    email: EmailStr
    password: str


class ForgotPasswordRequest(CamelModel):
    email: EmailStr


class ResetPasswordRequest(CamelModel):
    email: EmailStr
    otp: str
    new_password: str = Field(min_length=8)


class VoterIdOtpRequest(CamelModel):
    voter_id_number: str


class VoterIdVerifyRequest(CamelModel):
    voter_id_number: str
    otp: str


class CandidateRegistrationRequest(CamelModel):
    full_name: str = Field(max_length=150)
    email: EmailStr
    phone: Optional[str] = Field(None, max_length=20)
    election_id: int
    constituency_id: int
    party_name: Optional[str] = Field(None, max_length=150)
    manifesto: Optional[str] = None
    education: Optional[str] = Field(None, max_length=255)
    criminal_record: Optional[str] = None


# ── Account-claim flow (existing Voter ID holder) ──────────────────────────

class ClaimLookupRequest(CamelModel):
    voter_id_number: str


class ClaimSendOtpRequest(CamelModel):
    voter_id_number: str
    email: EmailStr


class ClaimVerifyRequest(CamelModel):
    voter_id_number: str
    otp: str
    password: str = Field(min_length=8)


class VoterIdLookupResponse(CamelResponse):
    voter_id_number: str
    full_name: str
    constituency_name: str
    gender: Optional[str]


# ── Response models ────────────────────────────────────────────────────────

class AuthResponse(CamelResponse):
    access_token: str
    token_type: str = "Bearer"
    user_id: int
    email: str
    full_name: str
    role: Role


class UserResponse(CamelResponse):
    id: int
    email: str
    full_name: str
    phone: Optional[str]
    role: Role
    is_active: bool
    email_verified: bool
    constituency_id: Optional[int] = None
    constituency_name: Optional[str] = None

