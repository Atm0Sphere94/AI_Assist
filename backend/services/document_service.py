"""Document service for managing document uploads and metadata."""
import os
import hashlib
from datetime import datetime
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from db.models import Document, User
from config import settings


class DocumentService:
    """Service for document management."""
    
    def __init__(self, db: AsyncSession):
        """Initialize document service with database session."""
        self.db = db
    
    async def create_document(
        self,
        user_id: int,
        file_path: str,
        original_filename: str,
        folder_id: Optional[int] = None,
        metadata: Optional[dict] = None
    ) -> Document:
        """
        Create a document record in the database.
        
        Args:
            user_id: User ID who owns the document
            file_path: Local path to the file
            original_filename: Original filename
            folder_id: Optional folder ID
            metadata: Optional metadata dict
            
        Returns:
            Created Document instance
        """
        # Get file info
        file_size = os.path.getsize(file_path) if os.path.exists(file_path) else 0
        
        # Calculate file hash
        file_hash = None
        if os.path.exists(file_path):
            with open(file_path, 'rb') as f:
                file_hash = hashlib.md5(f.read()).hexdigest()
        
        # Determine file type from extension
        file_ext = os.path.splitext(original_filename)[1].lower()
        file_type_map = {
            '.pdf': 'pdf',
            '.txt': 'text',
            '.md': 'markdown',
            '.doc': 'document',
            '.docx': 'document',
            '.jpg': 'image',
            '.jpeg': 'image',
            '.png': 'image',
        }
        file_type = file_type_map.get(file_ext, 'other')
        
        # Create document
        document = Document(
            user_id=user_id,
            filename=os.path.basename(file_path),
            original_filename=original_filename,
            folder_id=folder_id,
            file_path=file_path,
            file_size=file_size,
            document_type=file_type,
            meta_data=metadata or {},
            created_at=datetime.utcnow()
        )
        
        self.db.add(document)
        await self.db.commit()
        await self.db.refresh(document)
        
        return document
    
    async def get_document(self, document_id: int) -> Optional[Document]:
        """Get document by ID."""
        return await self.db.get(Document, document_id)
        
    async def list_documents(self, user_id: int, folder_id: Optional[int] = None, limit: int = 10, offset: int = 0) -> list[Document]:
        """List user documents."""
        query = select(Document).where(
            Document.user_id == user_id,
            Document.folder_id == folder_id
        ).order_by(Document.created_at.desc()).limit(limit).offset(offset)
        result = await self.db.execute(query)
        return result.scalars().all()
    
    async def update_document(self, document_id: int, **kwargs) -> Optional[Document]:
        """Update document fields."""
        document = await self.get_document(document_id)
        if not document:
            return None
            
        for key, value in kwargs.items():
            if hasattr(document, key):
                setattr(document, key, value)
                
        await self.db.commit()
        await self.db.refresh(document)
        return document
    
    async def delete_document(self, document_id: int) -> bool:
        """Delete document by ID."""
        document = await self.get_document(document_id)
        if not document:
            return False
        
        # Delete file if exists
        if os.path.exists(document.file_path):
            os.remove(document.file_path)
        
        await self.db.delete(document)
        await self.db.commit()
        return True
