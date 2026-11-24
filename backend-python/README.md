# Online Voting System — FastAPI Backend

Python/FastAPI backend for the Online Voting System (India). Features: auth, elections, voting, candidates, voter ID applications, results, forum, chat WebSocket, notifications, scheduler, email.

## Setup

```bash
cd backend-python
python -m venv venv
source venv/bin/activate      # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

## Configuration

```bash
cp .env.example .env
# Edit .env — set DB_PASSWORD, JWT_SECRET, MAIL_* credentials
```

## Database

```bash
# Run Alembic migration (creates all tables + seed data: Karnataka constituencies,
# pincodes and 5 demo voters whose accounts can be claimed by Voter ID)
alembic upgrade head
```

### Account types

Voter, candidate and staff accounts are separate, and each signs in only on its own
login tab. A person who wants to vote and also stand for election registers twice,
with two different email addresses: a voter account (which votes) and a candidate
account (which files nominations). Voter accounts can't file nominations, and
candidate accounts can't vote or apply for a Voter ID.

### Staff accounts

There is no sign-up for staff. Create the Election Officer and Booth Level Officer accounts with:

```bash
python -m app.scripts.create_staff --role ADMIN --email admin@voting.gov.in --name "Election Officer"
python -m app.scripts.create_staff --role FIELD_OFFICER --email officer@voting.gov.in \
    --name "Booth Level Officer Bengaluru South" --constituency "Bengaluru South"
```

You'll be prompted for a password (or pass `--password`). Booth Level Officers only see
Voter ID applications from their own constituency.

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

- API docs: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
- Health: http://localhost:8000/health

## Tests

```bash
pip install -r requirements-dev.txt
pytest
```

Tests run against an in-memory SQLite database, so no MySQL is needed.

## API Surface

Identical to the Spring Boot backend:

| Group | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `/login`, `/refresh`, `/logout`, `/forgot-password`, `/reset-password`, `GET /api/auth/me`, `POST /voter-id/request-otp`, `/voter-id/verify`, `/candidate/register` |
| Elections | `GET /api/elections`, `/elections/{id}`, `/elections/{id}/candidates`, `/elections/{id}/live-stats` |
| Voting | `POST /api/elections/{id}/vote`, `GET /api/elections/{id}/vote-status` |
| Candidates | `GET /api/candidates/{id}`, `POST /api/candidates/nominate`, `PUT /api/candidates/profile`, `GET /api/candidates/mine` |
| Applications | `POST /api/applications`, `GET /api/applications/{id}/status`, `GET /api/applications/mine` |
| Voter | `GET /api/voter/profile`, `/voter/elections`, `/voter/vote-status/{id}` |
| Field Officer | `GET /api/field-officer/applications`, `GET /api/field-officer/applications/{id}`, `PATCH /api/field-officer/applications/{id}/review` |
| Admin | `POST /api/admin/elections`, `GET /api/admin/elections`, `PATCH /api/admin/elections/{id}/status`, `GET /api/admin/nominations`, `PATCH /api/admin/nominations/{id}/review`, `POST /api/admin/results/{id}/manual`, `PATCH /api/admin/results/{id}/finalize` |
| Results | `GET /api/results/{election_id}` |
| Forum | `POST /api/forum/threads`, `GET /api/forum/threads/constituency/{id}`, `/election/{id}`, `POST /threads/{id}/posts`, `GET /threads/{id}/posts`, `PUT /posts/{id}`, `DELETE /posts/{id}`, `GET /chat/{room}/history` |
| Notifications | `GET /api/notifications`, `/unread-count`, `PATCH /{id}/read`, `/read-all` |
| Constituencies | `GET /api/constituencies`, `/karnataka`, `/by-pincode/{pin}`, `/stats` |
| WebSocket | `ws://.../ws/election/{id}/stats`, `ws://.../ws/chat/{constituencyId}?token=...`, `ws://.../ws/notifications?token=...` |

## Notes

- WebSocket uses native WS (not STOMP/SockJS)
- When `MAIL_USERNAME` is empty, emails are printed to the backend terminal instead of sent
- Election status auto-transitions run every 60 seconds via APScheduler
