from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_

from app.db.database import get_db
from app.models.user import User, UserRole
from app.models.message import Message
from app.schemas.message_schema import MessageCreate, MessageResponse, UnreadCountResponse
from app.schemas.user_schema import UserResponse
from app.api.deps import get_current_user

router = APIRouter()

@router.post("", response_model=MessageResponse)
def send_message(
    msg_in: MessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    receiver = db.query(User).filter(User.id == msg_in.receiver_id).first()
    if not receiver:
        raise HTTPException(status_code=404, detail="Receiver not found")

    new_msg = Message(
        sender_id=current_user.id,
        receiver_id=msg_in.receiver_id,
        content=msg_in.content
    )
    db.add(new_msg)
    db.commit()
    db.refresh(new_msg)
    return new_msg

@router.get("", response_model=List[MessageResponse])
def get_messages(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get all messages sent OR received by current user, ordered by newest first"""
    messages = (
        db.query(Message)
        .filter(or_(Message.sender_id == current_user.id, Message.receiver_id == current_user.id))
        .order_by(Message.created_at.desc())
        .all()
    )
    return messages

@router.get("/unread_count", response_model=UnreadCountResponse)
def get_unread_count(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    count = db.query(Message).filter(
        Message.receiver_id == current_user.id, 
        Message.is_read == False
    ).count()
    return {"count": count}

@router.put("/{msg_id}/read", response_model=MessageResponse)
def mark_message_read(
    msg_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    msg = db.query(Message).filter(Message.id == msg_id).first()
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")
    
    if msg.receiver_id != current_user.id:
        raise HTTPException(status_code=403, detail="You can only read your own messages")
    
    msg.is_read = True
    db.commit()
    db.refresh(msg)
    return msg

@router.get("/users/search", response_model=List[UserResponse])
def search_users_for_messaging(
    q: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Search users for messaging. 
       - Admin: can search anyone.
       - Teacher: can search students in their classes, and admins.
       - Student: can search their teachers and admins.
       For simplicity here, we allow searching anyone with a limit.
    """
    if not q or len(q) < 1:
        return []
    
    query = db.query(User).filter(
        User.id != current_user.id,
        User.is_active == True,
        or_(
            User.full_name.ilike(f"%{q}%"),
            User.email.ilike(f"%{q}%")
        )
    ).limit(10).all()
    
    return query
