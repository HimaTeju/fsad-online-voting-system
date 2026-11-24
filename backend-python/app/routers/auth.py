from fastapi import APIRouter, Depends, Response, BackgroundTasks, HTTPException, Request
from sqlalchemy.orm import Session
from app.dependencies import get_db, get_current_user
from app.models.user import User
from app.schemas.auth import (
    RegisterRequest, LoginRequest, ForgotPasswordRequest, ResetPasswordRequest,
    VoterIdOtpRequest, VoterIdVerifyRequest, CandidateRegistrationRequest,
    AuthResponse, UserResponse,
    ClaimLookupRequest, ClaimSendOtpRequest, ClaimVerifyRequest,
)
from app.schemas.common import ApiResponse
import app.services.auth_service as svc

router = APIRouter()


@router.post("/register", response_model=ApiResponse[AuthResponse])
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    result = svc.register(req, db)
    return ApiResponse.ok(result, "Registration successful")


@router.post("/login", response_model=ApiResponse[AuthResponse])
def login(req: LoginRequest, response: Response, db: Session = Depends(get_db)):
    result = svc.login(req, response, db)
    return ApiResponse.ok(result, "Login successful")


@router.post("/refresh")
def refresh(request: Request, db: Session = Depends(get_db)):
    token = request.cookies.get("refreshToken", "")
    if not token:
        raise HTTPException(401, "No refresh token provided")
    result = svc.refresh_token(token, db)
    return ApiResponse.ok(result)


@router.post("/logout")
def logout(response: Response):
    svc.logout(response)
    return ApiResponse.ok(message="Logged out successfully")


@router.post("/forgot-password")
def forgot_password(
    req: ForgotPasswordRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    svc.forgot_password(req.email, db, background_tasks)
    return ApiResponse.ok(message="If that email is registered, an OTP has been sent")


@router.post("/reset-password")
def reset_password(req: ResetPasswordRequest, db: Session = Depends(get_db)):
    svc.reset_password(req.email, req.otp, req.new_password, db)
    return ApiResponse.ok(message="Password reset successful")


@router.get("/me", response_model=ApiResponse[UserResponse])
def get_me(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    result = svc.get_me(current_user.id, db)
    return ApiResponse.ok(result)


@router.post("/voter-id/request-otp")
def voter_id_request_otp(
    req: VoterIdOtpRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    svc.request_voter_id_otp(req.voter_id_number, db, background_tasks)
    return ApiResponse.ok(message="OTP sent if voter ID exists")


@router.post("/voter-id/verify", response_model=ApiResponse[AuthResponse])
def voter_id_verify(
    req: VoterIdVerifyRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    result = svc.verify_voter_id_otp(req.voter_id_number, req.otp, response, db)
    return ApiResponse.ok(result, "Login successful")


@router.post("/candidate/register")
def register_candidate(
    req: CandidateRegistrationRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    result = svc.register_candidate(req, db, background_tasks)
    return ApiResponse.ok(result)


# ── Account-claim flow ──────────────────────────────────────────────────────

@router.post("/claim/lookup")
def claim_lookup(req: ClaimLookupRequest, db: Session = Depends(get_db)):
    result = svc.lookup_voter_id(req.voter_id_number, db)
    return ApiResponse.ok(result)


@router.post("/claim/send-otp")
def claim_send_otp_route(
    req: ClaimSendOtpRequest,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
):
    svc.claim_send_otp(req.voter_id_number, req.email, db, background_tasks)
    return ApiResponse.ok(message="OTP sent to your email address")


@router.post("/claim/verify", response_model=ApiResponse[AuthResponse])
def claim_verify_route(
    req: ClaimVerifyRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    result = svc.claim_verify(req.voter_id_number, req.otp, req.password, response, db)
    return ApiResponse.ok(result, "Account created. Welcome!")
