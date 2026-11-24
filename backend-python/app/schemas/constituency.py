from typing import Optional
from app.schemas.common import CamelResponse


class ConstituencyResponse(CamelResponse):
    id: int
    name: str
    state: str
    district: Optional[str]
    seat_type: str
    total_voters: Optional[int]
    region: Optional[str]


class ConstituencyStatsResponse(CamelResponse):
    total: int
    women_reserved: int
    states: int
