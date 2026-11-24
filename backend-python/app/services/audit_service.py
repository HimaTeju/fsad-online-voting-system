from sqlalchemy.orm import Session
from app.models.audit_log import AuditLog


def log_action(
    db: Session,
    actor_id: int | None,
    action: str,
    entity_type: str | None = None,
    entity_id: int | None = None,
    description: str | None = None,
    ip_address: str | None = None,
) -> None:
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        description=description,
        ip_address=ip_address,
    )
    db.add(entry)
    db.commit()
