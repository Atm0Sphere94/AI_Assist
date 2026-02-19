from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import shutil
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

from db import get_db
from db.models import User, Document, Folder
from auth import get_current_user
from services.document_service import DocumentService
from services.folder_service import FolderService

router = APIRouter(tags=["documents"])

class DocumentResponse(BaseModel):
    id: int
    filename: str
    original_filename: str
    file_size: int
    document_type: Optional[str]
    is_processed: bool
    is_indexed: bool
    is_indexed: bool
    folder_id: Optional[int]
    created_at: datetime
    
    class Config:
        from_attributes = True

@router.get("/", response_model=List[DocumentResponse])
async def list_documents(
    folder_id: Optional[int] = None,
    recursive: bool = False,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    service = DocumentService(db)
    return await service.list_documents(
        current_user.id, 
        folder_id=folder_id, 
        limit=100,
        recursive=recursive
    )

from fastapi import BackgroundTasks
from services.rag_service import RAGService

# ... imports ...

async def background_index_document(document_id: int, db_session_maker):
    """Background task for indexing document."""
    async with db_session_maker() as db:
        service = RAGService(db)
        await service.index_document(document_id)

@router.post("/upload")
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    folder_id: Optional[int] = Form(None),
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
        original_filename=file.filename or "unknown",
        folder_id=folder_id
    )
    
    # Trigger indexing in background
    # We need a new session for the background task
    from db.session import async_session_maker
    background_tasks.add_task(background_index_document, document.id, async_session_maker)
    
    return {"message": "Document uploaded and indexing started", "document_id": document.id}

class DocumentUpdate(BaseModel):
    folder_id: Optional[int] = None
    filename: Optional[str] = None

@router.put("/{document_id}", response_model=DocumentResponse)
async def update_document(
    document_id: int,
    document_in: DocumentUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update document (e.g. move to folder)."""
    service = DocumentService(db)
    doc = await service.get_document(document_id)
    if not doc or doc.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Document not found")
        
    updated_doc = await service.update_document(
        document_id,
        **document_in.model_dump(exclude_unset=True)
    )
    return updated_doc

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


# Folder endpoints
@router.get("/folders/tree")
async def get_folder_tree(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get folder tree for current user."""
    folder_service = FolderService(db)
    tree = await folder_service.get_folder_tree(current_user.id)
    
    # Add document counts
    doc_service = DocumentService(db)
    async def add_counts(folder_item):
        docs = await doc_service.list_documents(
            user_id=current_user.id,
            folder_id=folder_item['id'],
            limit=1000,
            recursive=False
        )
        folder_item['document_count'] = len(docs)
        for child in folder_item.get('children', []):
            await add_counts(child)
    
    for folder in tree:
        await add_counts(folder)
    
    return {"folders": tree}


@router.get("/folders/{folder_id}/files")
async def get_folder_files(
    folder_id: int,
    limit: int = 50,
    offset: int = 0,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Get files in a specific folder."""
    folder = await db.get(Folder, folder_id)
    if not folder or folder.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    doc_service = DocumentService(db)
    documents = await doc_service.list_documents(
        user_id=current_user.id,
        folder_id=folder_id,
        limit=limit,
        offset=offset,
        recursive=False
    )
    
    return {
        "folder_id": folder_id,
        "folder_name": folder.name,
        "documents": [DocumentResponse.model_validate(doc) for doc in documents],
        "total": len(documents)
    }


@router.get("/search")
async def search_documents(
    q: str,
    folder_id: Optional[int] = None,
    limit: int = 20,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Search documents by filename."""
    from sqlalchemy import select, or_
    
    query = select(Document).where(Document.user_id == current_user.id)
    query = query.where(
        or_(
            Document.filename.ilike(f"%{q}%"),
            Document.original_filename.ilike(f"%{q}%")
        )
    )
    
    if folder_id is not None:
        query = query.where(Document.folder_id == folder_id)
    
    query = query.limit(limit)
    result = await db.execute(query)
    documents = result.scalars().all()
    
    return {
        "query": q,
        "results": [DocumentResponse.model_validate(doc) for doc in documents],
        "total": len(documents)
    }
    return {
        "query": q,
        "results": [DocumentResponse.model_validate(doc) for doc in documents],
        "total": len(documents)
    }

@router.delete("/folders/{folder_id}")
async def delete_folder(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a folder and all its contents."""
    service = FolderService(db)
    success = await service.delete_folder(folder_id, current_user.id)
    
    if not success:
        raise HTTPException(status_code=404, detail="Folder not found or permission denied")
        
    return {"message": "Folder deleted successfully"}
