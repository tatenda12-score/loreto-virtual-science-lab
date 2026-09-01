"""
app/services/audit_service.py
-----------------------------
Service for writing audit logs.
"""

from sqlalchemy.orm import Session
from app.models.audit import AuditLog

def log_action(
    db: Session,
    user_id: int | None,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    metadata_payload: dict | None = None,
):
    """
    Creates an audit log entry.
    """
    # Ensure sensitive data doesn't leak into metadata
    if metadata_payload:
        sanitized = metadata_payload.copy()
        if "password" in sanitized:
            sanitized["password"] = "***"
        if "hashed_password" in sanitized:
            sanitized["hashed_password"] = "***"
    else:
        sanitized = None

    audit_entry = AuditLog(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        metadata_payload=sanitized,
    )
    db.add(audit_entry)
    # Note: We rely on the caller's transaction to commit this log, 
    # ensuring it's atomically committed with the main action.
