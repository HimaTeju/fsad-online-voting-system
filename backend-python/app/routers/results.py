from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.dependencies import get_db
from app.schemas.common import ApiResponse
import app.services.result_service as svc

router = APIRouter()


@router.get("/results/{election_id}")
def get_results(election_id: int, db: Session = Depends(get_db)):
    result = svc.get_results(election_id, db)
    return ApiResponse.ok(result)
