from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status, Response
from sqlalchemy.orm import Session

from app.models.user import User
from app.models.voter_profile import VoterProfile
from app.models.password_reset_token import PasswordResetToken
from app.models.enums import Role
from app.schemas.auth import (
    RegisterRequest, LoginRequest, AuthResponse, UserResponse,
    VoterIdLookupResponse,
)
from app.security.passwords import hash_password, verify_password
from app.security.jwt import create_access_token, create_refresh_token, decode_token
from app.utils.otp import generate_otp
from app.config import settings


REFRESH_COOKIE = "refreshToken"
PLACEHOLDER_SUFFIX = "@placeholder.invalid"

# In-process store: voter_profile.user_id → email being claimed.
# Safe for a single-process dev/demo server.
_pending_claims: dict[int, str] = {}


def _make_auth_response(user: User, db: Session) -> AuthResponse:
    access_token = create_access_token(user.id, user.email, user.role.value)
    return AuthResponse(
        access_token=access_token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
    )


def _set_refresh_cookie(response: Response, user: User) -> None:
    refresh_token = create_refresh_token(user.id)
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        httponly=True,
        max_age=settings.jwt_refresh_token_expire_days * 86400,
        path="/api/auth/refresh",
        samesite="lax",
    )


def register(req: RegisterRequest, db: Session) -> AuthResponse:
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        phone=req.phone,
        role=Role.VOTER,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _make_auth_response(user, db)


def login(req: LoginRequest, response: Response, db: Session) -> AuthResponse:
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is deactivated")
    _set_refresh_cookie(response, user)
    return _make_auth_response(user, db)


def refresh_token(refresh_tok: str, db: Session) -> dict:
    try:
        payload = decode_token(refresh_tok)
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")
        user_id = int(payload["sub"])
    except (ValueError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access_token = create_access_token(user.id, user.email, user.role.value)
    return {"access_token": access_token, "token_type": "Bearer"}


def logout(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE, path="/api/auth/refresh")


def forgot_password(email: str, db: Session, background_tasks) -> None:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return  # prevent enumeration
    otp = generate_otp()
    otp_hash = hash_password(otp)
    expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    token = PasswordResetToken(user_id=user.id, otp_hash=otp_hash, expires_at=expires)
    db.add(token)
    db.commit()
    from app.services.email_service import send_password_reset_otp
    background_tasks.add_task(send_password_reset_otp, user.email, user.full_name, otp)


def reset_password(email: str, otp: str, new_password: str, db: Session) -> None:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid request")
    now = datetime.now(timezone.utc)
    tokens = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False,
            PasswordResetToken.expires_at > now,
        )
        .order_by(PasswordResetToken.expires_at.desc())
        .all()
    )
    for t in tokens:
        if verify_password(otp, t.otp_hash):
            t.used = True
            user.password_hash = hash_password(new_password)
            db.commit()
            return
    raise HTTPException(status_code=400, detail="Invalid or expired OTP")


def request_voter_id_otp(voter_id_number: str, db: Session, background_tasks) -> None:
    profile = db.query(VoterProfile).filter(VoterProfile.voter_id_number == voter_id_number).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Voter ID not found")
    user = profile.user
    otp = generate_otp()
    otp_hash = hash_password(otp)
    expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    token = PasswordResetToken(user_id=user.id, otp_hash=otp_hash, expires_at=expires)
    db.add(token)
    db.commit()
    from app.services.email_service import send_password_reset_otp
    background_tasks.add_task(send_password_reset_otp, user.email, user.full_name, otp)


def verify_voter_id_otp(
    voter_id_number: str, otp: str, response: Response, db: Session
) -> AuthResponse:
    profile = db.query(VoterProfile).filter(VoterProfile.voter_id_number == voter_id_number).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Voter ID not found")
    user = profile.user
    now = datetime.now(timezone.utc)
    tokens = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False,
            PasswordResetToken.expires_at > now,
        )
        .order_by(PasswordResetToken.expires_at.desc())
        .all()
    )
    for t in tokens:
        if verify_password(otp, t.otp_hash):
            t.used = True
            db.commit()
            _set_refresh_cookie(response, user)
            return _make_auth_response(user, db)
    raise HTTPException(status_code=400, detail="Invalid or expired OTP")


def register_candidate(req, db: Session, background_tasks) -> dict:
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    import secrets as sec
    temp_password = sec.token_urlsafe(12)
    user = User(
        email=req.email,
        password_hash=hash_password(temp_password),
        full_name=req.full_name,
        phone=req.phone,
        role=Role.CANDIDATE,
    )
    db.add(user)
    db.flush()

    from app.models.candidate import Candidate
    from app.models.enums import NominationStatus
    candidate = Candidate(
        user_id=user.id,
        election_id=req.election_id,
        constituency_id=req.constituency_id,
        party_name=req.party_name,
        manifesto=req.manifesto,
        education=req.education,
        criminal_record=req.criminal_record,
        nomination_status=NominationStatus.SUBMITTED,
    )
    db.add(candidate)
    db.commit()
    db.refresh(user)
    return {"message": "Candidate registered. Credentials will be sent on nomination approval."}


def get_me(user_id: int, db: Session) -> UserResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    resp = UserResponse.model_validate(user)
    if user.constituency:
        resp.constituency_name = user.constituency.name
    return resp


# ── Account-claim flow ──────────────────────────────────────────────────────

def lookup_voter_id(voter_id_number: str, db: Session) -> VoterIdLookupResponse:
    profile = (
        db.query(VoterProfile)
        .filter(VoterProfile.voter_id_number == voter_id_number)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Voter ID not found. Check the number and try again.")
    user = profile.user
    if not user.email.endswith(PLACEHOLDER_SUFFIX):
        raise HTTPException(status_code=409, detail="This Voter ID already has an account. Please sign in.")
    constituency_name = profile.constituency.name if profile.constituency else "Unknown"
    return VoterIdLookupResponse(
        voter_id_number=profile.voter_id_number,
        full_name=user.full_name,
        constituency_name=constituency_name,
        gender=profile.gender.value if profile.gender else None,
    )


def claim_send_otp(voter_id_number: str, email: str, db: Session, background_tasks) -> None:
    profile = (
        db.query(VoterProfile)
        .filter(VoterProfile.voter_id_number == voter_id_number)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Voter ID not found")
    user = profile.user
    if not user.email.endswith(PLACEHOLDER_SUFFIX):
        raise HTTPException(status_code=409, detail="This Voter ID already has an account.")

    # Reject if the target email is taken by any real account
    existing = db.query(User).filter(User.email == email).first()
    if existing and not existing.email.endswith(PLACEHOLDER_SUFFIX):
        raise HTTPException(status_code=409, detail="That email address is already in use.")

    otp = generate_otp()
    otp_hash = hash_password(otp)
    expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    db.add(PasswordResetToken(user_id=user.id, otp_hash=otp_hash, expires_at=expires))
    db.commit()

    _pending_claims[user.id] = email

    from app.services.email_service import send_password_reset_otp
    background_tasks.add_task(send_password_reset_otp, email, user.full_name, otp)


def claim_verify(
    voter_id_number: str, otp: str, password: str, response: Response, db: Session
) -> AuthResponse:
    profile = (
        db.query(VoterProfile)
        .filter(VoterProfile.voter_id_number == voter_id_number)
        .first()
    )
    if not profile:
        raise HTTPException(status_code=404, detail="Voter ID not found")
    user = profile.user

    now = datetime.now(timezone.utc)
    tokens = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False,
            PasswordResetToken.expires_at > now,
        )
        .order_by(PasswordResetToken.expires_at.desc())
        .all()
    )
    for t in tokens:
        if verify_password(otp, t.otp_hash):
            t.used = True
            claimed_email = _pending_claims.pop(user.id, None)
            if not claimed_email:
                raise HTTPException(status_code=400, detail="Session expired. Please restart the account setup.")
            user.email = claimed_email
            user.password_hash = hash_password(password)
            user.email_verified = True
            db.commit()
            db.refresh(user)
            _set_refresh_cookie(response, user)
            return _make_auth_response(user, db)

    raise HTTPException(status_code=400, detail="Invalid or expired OTP. Please try again.")



REFRESH_COOKIE = "refreshToken"


def _make_auth_response(user: User, db: Session) -> AuthResponse:
    access_token = create_access_token(user.id, user.email, user.role.value)
    return AuthResponse(
        access_token=access_token,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
    )


def _set_refresh_cookie(response: Response, user: User) -> None:
    refresh_token = create_refresh_token(user.id)
    response.set_cookie(
        key=REFRESH_COOKIE,
        value=refresh_token,
        httponly=True,
        max_age=settings.jwt_refresh_token_expire_days * 86400,
        path="/api/auth/refresh",
        samesite="lax",
    )


def register(req: RegisterRequest, db: Session) -> AuthResponse:
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=req.email,
        password_hash=hash_password(req.password),
        full_name=req.full_name,
        phone=req.phone,
        role=Role.VOTER,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return _make_auth_response(user, db)


def login(req: LoginRequest, response: Response, db: Session) -> AuthResponse:
    user = db.query(User).filter(User.email == req.email).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not user.is_active:
        raise HTTPException(status_code=401, detail="Account is deactivated")
    _set_refresh_cookie(response, user)
    return _make_auth_response(user, db)


def refresh_token(refresh_tok: str, db: Session) -> dict:
    try:
        payload = decode_token(refresh_tok)
        if payload.get("type") != "refresh":
            raise ValueError("Not a refresh token")
        user_id = int(payload["sub"])
    except (ValueError, KeyError):
        raise HTTPException(status_code=401, detail="Invalid refresh token")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    access_token = create_access_token(user.id, user.email, user.role.value)
    return {"access_token": access_token, "token_type": "Bearer"}


def logout(response: Response) -> None:
    response.delete_cookie(key=REFRESH_COOKIE, path="/api/auth/refresh")


def forgot_password(email: str, db: Session, background_tasks) -> None:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        return  # prevent enumeration
    otp = generate_otp()
    otp_hash = hash_password(otp)
    expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    token = PasswordResetToken(user_id=user.id, otp_hash=otp_hash, expires_at=expires)
    db.add(token)
    db.commit()
    from app.services.email_service import send_password_reset_otp
    background_tasks.add_task(send_password_reset_otp, user.email, user.full_name, otp)


def reset_password(email: str, otp: str, new_password: str, db: Session) -> None:
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=400, detail="Invalid request")
    now = datetime.now(timezone.utc)
    tokens = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False,
            PasswordResetToken.expires_at > now,
        )
        .order_by(PasswordResetToken.expires_at.desc())
        .all()
    )
    for t in tokens:
        if verify_password(otp, t.otp_hash):
            t.used = True
            user.password_hash = hash_password(new_password)
            db.commit()
            return
    raise HTTPException(status_code=400, detail="Invalid or expired OTP")


def request_voter_id_otp(voter_id_number: str, db: Session, background_tasks) -> None:
    profile = db.query(VoterProfile).filter(VoterProfile.voter_id_number == voter_id_number).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Voter ID not found")
    user = profile.user
    otp = generate_otp()
    otp_hash = hash_password(otp)
    expires = datetime.now(timezone.utc) + timedelta(minutes=15)
    token = PasswordResetToken(user_id=user.id, otp_hash=otp_hash, expires_at=expires)
    db.add(token)
    db.commit()
    from app.services.email_service import send_password_reset_otp
    background_tasks.add_task(send_password_reset_otp, user.email, user.full_name, otp)


def verify_voter_id_otp(
    voter_id_number: str, otp: str, response: Response, db: Session
) -> AuthResponse:
    profile = db.query(VoterProfile).filter(VoterProfile.voter_id_number == voter_id_number).first()
    if not profile:
        raise HTTPException(status_code=404, detail="Voter ID not found")
    user = profile.user
    now = datetime.now(timezone.utc)
    tokens = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used == False,
            PasswordResetToken.expires_at > now,
        )
        .order_by(PasswordResetToken.expires_at.desc())
        .all()
    )
    for t in tokens:
        if verify_password(otp, t.otp_hash):
            t.used = True
            db.commit()
            _set_refresh_cookie(response, user)
            return _make_auth_response(user, db)
    raise HTTPException(status_code=400, detail="Invalid or expired OTP")


def register_candidate(req, db: Session, background_tasks) -> dict:
    if db.query(User).filter(User.email == req.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    import secrets as sec
    temp_password = sec.token_urlsafe(12)
    user = User(
        email=req.email,
        password_hash=hash_password(temp_password),
        full_name=req.full_name,
        phone=req.phone,
        role=Role.CANDIDATE,
    )
    db.add(user)
    db.flush()

    from app.models.candidate import Candidate
    from app.models.enums import NominationStatus
    candidate = Candidate(
        user_id=user.id,
        election_id=req.election_id,
        constituency_id=req.constituency_id,
        party_name=req.party_name,
        manifesto=req.manifesto,
        education=req.education,
        criminal_record=req.criminal_record,
        nomination_status=NominationStatus.SUBMITTED,
    )
    db.add(candidate)
    db.commit()
    db.refresh(user)
    return {"message": "Candidate registered. Credentials will be sent on nomination approval."}


def get_me(user_id: int, db: Session) -> UserResponse:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    resp = UserResponse.model_validate(user)
    if user.constituency:
        resp.constituency_name = user.constituency.name
    return resp
