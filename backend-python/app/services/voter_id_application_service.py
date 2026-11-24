from datetime import datetime, timezone
from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.models.voter_id_application import VoterIdApplication
from app.models.voter_profile import VoterProfile
from app.models.constituency_pincode import ConstituencyPincode
from app.models.enums import ApplicationStatus
from app.schemas.voter import VoterIdApplicationRequest, ApplicationReviewRequest, ApplicationVerifyRequest, ApplicationResponse
from app.utils.voter_id import generate_voter_id


def _to_response(app: VoterIdApplication) -> ApplicationResponse:
    return ApplicationResponse(
        id=app.id,
        full_name=app.full_name,
        date_of_birth=app.date_of_birth,
        gender=app.gender,
        address=app.address,
        constituency_name=app.constituency.name if app.constituency else None,
        photo_url=app.photo_url,
        national_id=app.national_id,
        status=app.status,
        remarks=app.remarks,
        is_physical_verified=app.is_physical_verified,
        submitted_at=app.submitted_at,
        reviewed_at=app.reviewed_at,
    )


def submit_application(
    req: VoterIdApplicationRequest, user_id: int, db: Session
) -> ApplicationResponse:
    if db.query(VoterIdApplication).filter(
        VoterIdApplication.national_id == req.national_id
    ).first():
        raise HTTPException(409, "An application with this national ID already exists")

    pincode_row = (
        db.query(ConstituencyPincode)
        .filter(ConstituencyPincode.pincode == req.pincode)
        .first()
    )
    if not pincode_row:
        raise HTTPException(400, f"No constituency found for pincode {req.pincode}")

    application = VoterIdApplication(
        user_id=user_id,
        full_name=req.full_name,
        date_of_birth=req.date_of_birth,
        gender=req.gender,
        address=req.address,
        constituency_id=pincode_row.constituency_id,
        photo_url=req.photo_url,
        national_id=req.national_id,
        status=ApplicationStatus.PENDING,
    )
    db.add(application)
    db.commit()
    db.refresh(application)
    return _to_response(application)


def review_application(
    application_id: int,
    req: ApplicationReviewRequest,
    officer_id: int,
    db: Session,
    background_tasks,
) -> ApplicationResponse:
    app = db.query(VoterIdApplication).filter(VoterIdApplication.id == application_id).first()
    if not app:
        raise HTTPException(404, "Application not found")

    app.reviewed_by = officer_id
    app.reviewed_at = datetime.now(timezone.utc)
    app.remarks = req.remarks

    if req.approved:
        app.status = ApplicationStatus.APPROVED
        voter_id = generate_voter_id(app.constituency.name, db)
        profile = VoterProfile(
            user_id=app.user_id,
            voter_id_number=voter_id,
            constituency_id=app.constituency_id,
            date_of_birth=app.date_of_birth,
            gender=app.gender,
            address=app.address,
            photo_url=app.photo_url,
            national_id=app.national_id,
        )
        db.add(profile)
        from app.services.email_service import send_voter_id_approved
        background_tasks.add_task(
            send_voter_id_approved, app.user.email, app.user.full_name, voter_id
        )
    else:
        app.status = ApplicationStatus.REJECTED
        from app.services.email_service import send_voter_id_rejected
        background_tasks.add_task(
            send_voter_id_rejected, app.user.email, app.user.full_name, req.remarks
        )

    db.commit()
    db.refresh(app)
    return _to_response(app)


def get_status(application_id: int, db: Session) -> dict:
    app = db.query(VoterIdApplication).filter(VoterIdApplication.id == application_id).first()
    if not app:
        raise HTTPException(404, "Application not found")
    return {"id": app.id, "status": app.status.value, "remarks": app.remarks}


def get_my_applications(user_id: int, db: Session) -> list:
    apps = db.query(VoterIdApplication).filter(VoterIdApplication.user_id == user_id).all()
    return [_to_response(a) for a in apps]


def get_pending_applications(db: Session, page: int = 0, size: int = 20) -> list:
    apps = (
        db.query(VoterIdApplication)
        .filter(VoterIdApplication.status.in_([ApplicationStatus.PENDING, ApplicationStatus.UNDER_REVIEW]))
        .offset(page * size)
        .limit(size)
        .all()
    )
    return [_to_response(a) for a in apps]


def set_physical_verified(application_id: int, verified: bool, db: Session) -> ApplicationResponse:
    app = db.query(VoterIdApplication).filter(VoterIdApplication.id == application_id).first()
    if not app:
        raise HTTPException(404, "Application not found")
    app.is_physical_verified = verified
    db.commit()
    db.refresh(app)
    return _to_response(app)
