"""Chat API endpoint."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel

from sqlalchemy import select, desc
from db import get_db
from db.models import User, ConversationHistory, ChatSession
from auth import get_current_user
from agents.workflow import process_message

router = APIRouter(prefix="/api/chat", tags=["chat"])


class MessageRequest(BaseModel):
    """Chat message request."""
    message: str
    session_id: int | None = None


class MessageResponse(BaseModel):
    """Chat message response."""
    message: str
    session_id: int


class SessionResponse(BaseModel):
    """Chat session response."""
    id: int
    title: str
    created_at: str
    updated_at: str

class MessageHistoryResponse(BaseModel):
    """Message history response item."""
    id: int
    role: str
    content: str
    created_at: str


@router.get("/sessions", response_model=list[SessionResponse])
async def get_sessions(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get all user's chat sessions."""
    query = select(ChatSession).where(
        ChatSession.user_id == current_user.id
    ).order_by(desc(ChatSession.updated_at))
    
    result = await db.execute(query)
    sessions = result.scalars().all()
    
    return [
        SessionResponse(
            id=s.id,
            title=s.title,
            created_at=s.created_at.isoformat(),
            updated_at=s.updated_at.isoformat()
        ) for s in sessions
    ]

@router.get("/sessions/{session_id}/messages", response_model=list[MessageHistoryResponse])
async def get_session_messages(
    session_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get messages for a specific session."""
    # Verify session belongs to user
    session_query = select(ChatSession).where(
        ChatSession.id == session_id,
        ChatSession.user_id == current_user.id
    )
    result = await db.execute(session_query)
    session = result.scalar_one_or_none()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    messages_query = select(ConversationHistory).where(
        ConversationHistory.session_id == session_id
    ).order_by(ConversationHistory.created_at)
    
    result = await db.execute(messages_query)
    messages = result.scalars().all()
    
    return [
        MessageHistoryResponse(
            id=m.id,
            role=m.role,
            content=m.content,
            created_at=m.created_at.isoformat()
        ) for m in messages
    ]


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
    session_id = request.session_id
    
    # If no session_id provided, create a new session
    if not session_id:
        # Generate a brief title from the first message
        title = request.message[:30] + ("..." if len(request.message) > 30 else "")
        new_session = ChatSession(
            user_id=current_user.id,
            title=title
        )
        db.add(new_session)
        await db.flush()  # To get the ID
        session_id = new_session.id
    else:
        # Verify session belongs to user
        session_query = select(ChatSession).where(
            ChatSession.id == session_id,
            ChatSession.user_id == current_user.id
        )
        result = await db.execute(session_query)
        session = result.scalar_one_or_none()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
            
        # Update session updated_at
        session.updated_at = db.execute(select(db.func.now())).scalar()

    # Save user message
    user_message = ConversationHistory(
        user_id=current_user.id,
        session_id=session_id,
        role="user",
        content=request.message
    )
    db.add(user_message)
    await db.flush()
    
    # Fetch previous messages for context (short-term memory)
    # We fetch the last 20 messages for this session
    history_query = select(ConversationHistory).where(
        ConversationHistory.session_id == session_id
    ).order_by(desc(ConversationHistory.created_at)).limit(20)
    
    result = await db.execute(history_query)
    past_messages = result.scalars().all()
    past_messages.reverse() # Order chronologically
    
    # Format messages for LangGraph (as a list of dicts that we pass through context)
    chat_history = [
        {"role": msg.role, "content": msg.content} 
        for msg in past_messages if msg.id != user_message.id
    ]
    
    # Process through agentic workflow
    context = {
        "user_id": current_user.id,
        "telegram_id": current_user.telegram_id,
        "username": current_user.username,
        "first_name": current_user.first_name,
        "chat_history": chat_history,
        "session_id": session_id
    }
    
    response = await process_message(
        user_id=current_user.telegram_id,
        message=request.message,
        context=context
    )
    
    # Save AI response
    ai_message = ConversationHistory(
        user_id=current_user.id,
        session_id=session_id,
        role="assistant",
        content=response
    )
    db.add(ai_message)
    await db.commit()
    
    return MessageResponse(message=response, session_id=session_id)
