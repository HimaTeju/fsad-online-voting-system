from apscheduler.schedulers.background import BackgroundScheduler
from app.database import SessionLocal
import app.services.election_service as election_svc

_scheduler = BackgroundScheduler()


def _run_auto_transition():
    db = SessionLocal()
    try:
        election_svc.auto_transition_elections(db)
    except Exception:
        pass
    finally:
        db.close()


def start_scheduler():
    _scheduler.add_job(_run_auto_transition, "interval", seconds=60, id="election_auto_transition")
    _scheduler.start()


def stop_scheduler():
    if _scheduler.running:
        _scheduler.shutdown(wait=False)
