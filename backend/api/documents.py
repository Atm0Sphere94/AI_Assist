from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import shutil
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

from db import get_db
from db.models import User, Document
from auth import get_current_user
from services.document_service import DocumentService

router = APIRouter(tags=["documents"])

class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_size: int
    document_type: Optional[str]
    is_processed: bool
    is_indexed: bool
    created_at: datetime
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentService(db)
    return await service.list_documents(current_user.id, limit=100)

@router.post("/upload")
async def upload_document(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Ensure uploads directory exists
    upload_dir = "uploads"
    os.makedirs(upload_dir, exist_ok=True)
    
    # Save file
    file_path = os.path.join(upload_dir, f"{current_user.id}_{int(datetime.utcnow().timestamp())}_{file.filename}")
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
        
    service = DocumentService(db)
    document = await service.create_document(
        user_id=current_user.id,
        file_path=file_path,
        original_filename=file.filename or "unknown"
    )
    
    return {"message": "Document uploaded", "document_id": document.id}

@router.delete("/{document_id}")
async def delete_document(
    document_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentService(db)
    # Check ownership inside services/document_service.py delete_document? 
    # Actually delete_document only takes ID. We should verify ownership first.
    doc = await service.get_document(document_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")
        
    success = await service.delete_document(document_id)
    if not success:
        raise HTTPException(status_code=500, detail="Failed to delete document")
        
    return {"message": "Document deleted"}
