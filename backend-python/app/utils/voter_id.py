import re
import secrets
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.voter_profile import VoterProfile


def generate_voter_id(constituency_name: str, db: Session) -> str:
    cons_prefix = re.sub(r"[^a-zA-Z]", "", constituency_name)[:4].upper()
    year = datetime.now().year
    for _ in range(100):
        n = secrets.randbelow(1_000_000)
        voter_id = f"VID-{cons_prefix}-{year}-{n:06d}"
        if not db.query(VoterProfile).filter(VoterProfile.voter_id_number == voter_id).first():
            return voter_id
    raise RuntimeError("Failed to generate unique voter ID after 100 attempts")
