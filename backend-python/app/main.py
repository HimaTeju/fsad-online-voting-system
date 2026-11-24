from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from app.config import settings
from app.routers import (
    auth,
    elections,
    voting,
    candidates,
    applications,
    voter,
    field_officer,
    admin,
    results,
    forum,
    notifications,
    constituencies,
    websocket,
)
from app.exceptions.handlers import register_exception_handlers
from app.scheduler.election_scheduler import start_scheduler, stop_scheduler

app = FastAPI(
    title="Online Voting System API",
    description="Full-stack Online Voting System for India",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Authorization", "Set-Cookie"],
)

os.makedirs(settings.upload_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")

app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(elections.router, prefix="/api", tags=["Elections"])
app.include_router(voting.router, prefix="/api/elections", tags=["Voting"])
app.include_router(candidates.router, prefix="/api", tags=["Candidates"])
app.include_router(applications.router, prefix="/api/applications", tags=["Applications"])
app.include_router(voter.router, prefix="/api/voter", tags=["Voter"])
app.include_router(field_officer.router, prefix="/api/field-officer", tags=["Field Officer"])
app.include_router(admin.router, prefix="/api/admin", tags=["Admin"])
app.include_router(results.router, prefix="/api", tags=["Results"])
app.include_router(forum.router, prefix="/api/forum", tags=["Forum"])
app.include_router(notifications.router, prefix="/api/notifications", tags=["Notifications"])
app.include_router(constituencies.router, prefix="/api/constituencies", tags=["Constituencies"])
app.include_router(websocket.router, tags=["WebSocket"])

register_exception_handlers(app)


@app.on_event("startup")
def startup_event():
    start_scheduler()


@app.on_event("shutdown")
def shutdown_event():
    stop_scheduler()


@app.get("/health")
def health():
    return {"status": "ok"}
