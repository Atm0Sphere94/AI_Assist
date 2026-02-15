from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from datetime import datetime

from db.session import get_db
from db.models import Folder, User, Document
from api.auth import get_current_user

router = APIRouter()

# Pydantic models
class FolderCreate(BaseModel):
    name: str
    parent_id: Optional[int] = None

class FolderUpdate(BaseModel):
    name: Optional[str] = None
    parent_id: Optional[int] = None

class FolderResponse(BaseModel):
    id: int
    name: str
    parent_id: Optional[int]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

@router.post("/", response_model=FolderResponse)
async def create_folder(
    folder_in: FolderCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Create a new folder."""
    # Check if parent folder exists and belongs to user if parent_id is provided
    if folder_in.parent_id:
        parent = await db.get(Folder, folder_in.parent_id)
        if not parent or parent.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Parent folder not found")
            
    folder = Folder(
        name=folder_in.name,
        parent_id=folder_in.parent_id,
        user_id=current_user.id
    )
    
    db.add(folder)
    await db.commit()
    await db.refresh(folder)
    return folder

@router.get("/", response_model=List[FolderResponse])
async def list_folders(
    parent_id: Optional[int] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """List folders, optionally filtered by parent_id."""
    query = select(Folder).where(
        Folder.user_id == current_user.id,
        Folder.parent_id == parent_id
    )
    result = await db.execute(query)
    return result.scalars().all()

@router.put("/{folder_id}", response_model=FolderResponse)
async def update_folder(
    folder_id: int,
    folder_in: FolderUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Update a folder."""
    folder = await db.get(Folder, folder_id)
    if not folder or folder.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Folder not found")
        
    if folder_in.name is not None:
        folder.name = folder_in.name
    
    if folder_in.parent_id is not None:
        # Check for circular reference
        if folder_in.parent_id == folder_id:
            raise HTTPException(status_code=400, detail="Cannot move folder into itself")
            
        # Check if new parent exists
        if folder_in.parent_id:
             parent = await db.get(Folder, folder_in.parent_id)
             if not parent or parent.user_id != current_user.id:
                 raise HTTPException(status_code=404, detail="New parent folder not found")
        
        folder.parent_id = folder_in.parent_id
        
    await db.commit()
    await db.refresh(folder)
    return folder

@router.delete("/{folder_id}")
async def delete_folder(
    folder_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """Delete a folder and its contents (recursive)."""
    folder = await db.get(Folder, folder_id)
    if not folder or folder.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Folder not found")
    
    # Simple recursive delete is handled by cascade="all, delete-orphan" in relationship
    # Documents in this folder need to have their folder_id set to None or be deleted?
    # Requirement says "Delete folder" implies deleting contents usually, or we can move docs to root.
    # Let's decide to DELETE documents in the folder for now as is standard in many file systems (or move to trash). 
    # But wait, Document model has `folder = relationship("Folder", back_populates="documents")`.
    # It does NOT have cascade on the Folder side for documents in the `Folder` class I added:
    # `documents = relationship("Document", back_populates="folder")`
    # If I delete folder, documents folder_id will become NULL if nullable=True (it is).
    # So documents will move to root. This is safer.
    # Users can delete documents explicitly.
    
    await db.delete(folder)
    await db.commit()
    return {"status": "success", "message": "Folder deleted, documents moved to root"}
