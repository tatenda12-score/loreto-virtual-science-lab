from typing import Optional
from datetime import datetime
from pydantic import BaseModel
from .user_schema import UserResponse

class MessageCreate(BaseModel):
    receiver_id: int
    content: str

class MessageResponse(BaseModel):
    id: int
    sender_id: int
    receiver_id: int
    content: str
    is_read: bool
    created_at: datetime
    
    # We include sender so we know who it's from on the frontend
    sender: Optional[UserResponse] = None
    receiver: Optional[UserResponse] = None

    class Config:
        from_attributes = True

class UnreadCountResponse(BaseModel):
    count: int
