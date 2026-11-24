"""Test harness: runs the FastAPI app against an in-memory SQLite database.

No MySQL is needed. Outgoing email is captured in `sent_mail` instead of sent.
"""
import datetime as dt

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import BigInteger, create_engine
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.database as database
import app.models  # noqa: F401  (registers every model on Base.metadata)
import app.services.email_service as email_service
from app.dependencies import get_db
from app.main import app
from app.models import (
    Candidate, Constituency, ConstituencyPincode, Election, User, VoterProfile,
)
from app.models.enums import ElectionStatus, ElectionType, NominationStatus, Role
from app.security.jwt import create_access_token


@compiles(BigInteger, "sqlite")
def _bigint_as_integer(type_, compiler, **kw):
    # SQLite only auto-increments INTEGER PRIMARY KEY columns.
    return "INTEGER"


@pytest.fixture()
def db(monkeypatch):
    engine = create_engine(
        "sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool
    )
    database.Base.metadata.create_all(engine)
    Session = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    # Background tasks open their own sessions via SessionLocal.
    monkeypatch.setattr(database, "SessionLocal", Session)
    session = Session()
    yield session
    session.close()
    engine.dispose()


@pytest.fixture()
def sent_mail(monkeypatch):
    mail = []
    monkeypatch.setattr(
        email_service, "_send_email",
        lambda to, subject, html: mail.append({"to": to, "subject": subject, "html": html}),
    )
    return mail


@pytest.fixture()
def client(db, sent_mail):
    def _get_db():
        yield db

    app.dependency_overrides[get_db] = _get_db
    # Not used as a context manager, so the election scheduler doesn't start.
    yield TestClient(app)
    app.dependency_overrides.clear()


class Factory:
    def __init__(self, db):
        self.db = db
        self._n = 0

    def _next(self):
        self._n += 1
        return self._n

    def constituency(self, name, pincode=None):
        c = Constituency(name=name, state="Karnataka", district=name, seat_type="GENERAL")
        self.db.add(c)
        self.db.flush()
        if pincode:
            self.db.add(ConstituencyPincode(pincode=pincode, constituency_id=c.id))
        self.db.commit()
        return c

    def user(self, role=Role.VOTER, constituency=None, name=None):
        n = self._next()
        u = User(
            email=f"user{n}@example.com", password_hash="x", full_name=name or f"User {n}",
            role=role, is_active=True, email_verified=True,
            constituency_id=constituency.id if constituency else None,
        )
        self.db.add(u)
        self.db.commit()
        return u

    def voter(self, constituency):
        u = self.user(Role.VOTER)
        self.db.add(VoterProfile(
            user_id=u.id, voter_id_number=f"VID-TEST-{u.id:06d}",
            constituency_id=constituency.id, national_id=f"NID{u.id:09d}",
        ))
        self.db.commit()
        return u

    def election(self, constituency=None, status=ElectionStatus.NOMINATION_OPEN):
        now = dt.datetime.now()
        e = Election(
            title=f"Election {self._next()}", election_type=ElectionType.GENERAL,
            constituency_id=constituency.id if constituency else None, status=status,
            nomination_start=now - dt.timedelta(days=3), nomination_end=now - dt.timedelta(days=2),
            voting_start=now - dt.timedelta(days=1), voting_end=now + dt.timedelta(days=1),
            vote_salt="salt",
        )
        self.db.add(e)
        self.db.commit()
        return e

    def candidate(self, election, constituency, status=NominationStatus.APPROVED):
        u = self.user(Role.CANDIDATE)
        c = Candidate(
            user_id=u.id, election_id=election.id, constituency_id=constituency.id,
            party_name="Party", nomination_status=status,
        )
        self.db.add(c)
        self.db.commit()
        return c


@pytest.fixture()
def make(db):
    return Factory(db)


def auth(user):
    """Authorization header for a user, without going through /login."""
    token = create_access_token(user.id, user.email, user.role.value)
    return {"Authorization": f"Bearer {token}"}
