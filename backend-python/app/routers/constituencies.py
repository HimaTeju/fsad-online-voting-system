from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from app.dependencies import get_db
from app.models.constituency import Constituency
from app.models.constituency_pincode import ConstituencyPincode
from app.schemas.constituency import ConstituencyResponse, ConstituencyStatsResponse
from app.schemas.common import ApiResponse

router = APIRouter()


@router.get("", response_model=ApiResponse)
def list_constituencies(db: Session = Depends(get_db)):
    constituencies = db.query(Constituency).all()
    result = [ConstituencyResponse.model_validate(c) for c in constituencies]
    return ApiResponse.ok(result)


@router.get("/karnataka")
def karnataka_constituencies(db: Session = Depends(get_db)):
    constituencies = (
        db.query(Constituency)
        .filter(Constituency.state == "Karnataka")
        .order_by(Constituency.region.asc(), Constituency.name.asc())
        .all()
    )
    result = [ConstituencyResponse.model_validate(c) for c in constituencies]
    return ApiResponse.ok(result)


@router.get("/by-pincode/{pincode}")
def by_pincode(pincode: str, db: Session = Depends(get_db)):
    pincode_row = db.query(ConstituencyPincode).filter(ConstituencyPincode.pincode == pincode).first()
    if not pincode_row:
        raise HTTPException(404, f"No constituency found for pincode {pincode}")
    return ApiResponse.ok(ConstituencyResponse.model_validate(pincode_row.constituency))


@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    total = db.query(Constituency).count()
    women_reserved = db.query(Constituency).filter(Constituency.seat_type == "WOMEN_RESERVED").count()
    states = db.query(func.count(func.distinct(Constituency.state))).scalar()
    return ApiResponse.ok(ConstituencyStatsResponse(total=total, women_reserved=women_reserved, states=states))
