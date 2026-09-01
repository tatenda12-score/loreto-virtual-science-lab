"""
app/schemas/audit_schema.py
----------------------------
Pydantic schemas for the AuditLog resource.
"""

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel

class AuditLogResponse(BaseModel):
    id: int
    user_id: Optional[int]
    action: str
    entity_type: Optional[str]
    entity_id: Optional[str]
    metadata_payload: Optional[dict[str, Any]]
    created_at: datetime

    model_config = {
        "from_attributes": True,
    }
