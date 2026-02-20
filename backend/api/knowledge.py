from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional
from pydantic import BaseModel

from db import get_db
from db.models import User
from auth import get_current_user
from services.rag_service import RAGService

router = APIRouter(tags=["knowledge"])

class SearchResult(BaseModel):
    text: str
    score: float
    document_id: Optional[int]
    filename: str

@router.get("/search", response_model=List[SearchResult])
async def search_knowledge_base(
    q: str = Query(..., min_length=1, description="Search query"),
    limit: int = 5,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Search the knowledge base for relevant document chunks.
    """
    rag_service = RAGService(db)
    results = rag_service.search(
        query=q,
        user_id=current_user.id,
        limit=limit
    )
    return results

@router.post("/index/{document_id}")
async def index_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Manually trigger indexing for a document.
    """
    rag_service = RAGService(db)
    success = await rag_service.index_document(document_id)
    
    if not success:
        raise HTTPException(status_code=500, detail="Failed to index document")
        
    return {"message": "Document indexed successfully"}
