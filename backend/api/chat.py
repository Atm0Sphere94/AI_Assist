"""Chat API endpoint."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from db import get_db
from db.models import User, ConversationHistory
from auth import get_current_user
from agents.workflow import process_message

router = APIRouter(prefix="/api/chat", tags=["chat"])


class MessageRequest(BaseModel):
    """Chat message request."""
    message: str


class MessageResponse(BaseModel):
    """Chat message response."""
    message: str


@router.post("/message", response_model=MessageResponse)
async def send_message(
    request: MessageRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Send a message to AI and get response.
    
    Uses the agentic workflow to process the message.
    """
    # Save user message
    user_message = ConversationHistory(
        user_id=current_user.id,
        role="user",
        content=request.message
    )
    db.add(user_message)
    await db.commit()
    
    # Process through agentic workflow
    context = {
        "user_id": current_user.id,
        "telegram_id": current_user.telegram_id,
        "username": current_user.username,
        "first_name": current_user.first_name
    }
    
    response = await process_message(
        user_id=current_user.telegram_id,
        message=request.message,
        context=context
    )
    
    # Save AI response
    ai_message = ConversationHistory(
        user_id=current_user.id,
        role="assistant",
        content=response
    )
    db.add(ai_message)
    await db.commit()
    
    return MessageResponse(message=response)
