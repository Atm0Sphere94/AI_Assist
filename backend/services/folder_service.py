"""Folder service for managing document folder hierarchy."""
import logging
from typing import Optional, List
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from db.models import Folder

logger = logging.getLogger(__name__)


class FolderService:
    """Service for managing folder hierarchy."""
    
    def __init__(self, db: AsyncSession):
        """Initialize folder service."""
        self.db = db
    
    async def get_or_create_folder(
        self,
        user_id: int,
        name: str,
        parent_id: Optional[int] = None
    ) -> Folder:
        """
        Get existing folder or create new one.
        
        Args:
            user_id: User ID
            name: Folder name
            parent_id: Parent folder ID (None for root)
            
        Returns:
            Folder instance
        """
        # Try to find existing folder
        stmt = select(Folder).where(
            Folder.user_id == user_id,
            Folder.name == name,
            Folder.parent_id == parent_id
        )
        result = await self.db.execute(stmt)
        folder = result.scalar_one_or_none()
        
        if folder:
            return folder
        
        # Create new folder
        folder = Folder(
            user_id=user_id,
            name=name,
            parent_id=parent_id
        )
        self.db.add(folder)
        await self.db.commit()
        await self.db.refresh(folder)
        
        logger.info(f"Created folder: {name} (parent_id={parent_id})")
        return folder
    
    async def get_or_create_folder_hierarchy(
        self,
        user_id: int,
        path: str
    ) -> Folder:
        """
        Create folder hierarchy from path.
        
        Args:
            user_id: User ID
            path: Full path (e.g., "disk:/Архив/Документы")
            
        Returns:
            Deepest folder in hierarchy
        """
        # Parse path - remove disk: prefix and split
        clean_path = path.replace('disk:', '').strip('/')
        
        if not clean_path:
            # Root level - create/get root folder
            return await self.get_or_create_folder(user_id, "Облачное Хранилище", None)
        
        parts = clean_path.split('/')
        parent_id = None
        folder = None
        
        for part in parts:
            if not part:  # Skip empty parts
                continue
                
            folder = await self.get_or_create_folder(
                user_id=user_id,
                name=part,
                parent_id=parent_id
            )
            parent_id = folder.id
        
        return folder
    
    async def get_folder_path(self, folder_id: int) -> str:
        """
        Get full path for a folder.
        
        Args:
            folder_id: Folder ID
            
        Returns:
            Full path string
        """
        parts = []
        current_id = folder_id
        
        while current_id:
            folder = await self.db.get(Folder, current_id)
            if not folder:
                break
            
            parts.insert(0, folder.name)
            current_id = folder.parent_id
        
        return '/' + '/'.join(parts) if parts else '/'
    
    async def get_folder_tree(self, user_id: int, parent_id: Optional[int] = None) -> List[dict]:
        """
        Get folder tree for user.
        
        Args:
            user_id: User ID
            parent_id: Parent folder ID (None for root level)
            
        Returns:
            List of folders with children
        """
        stmt = select(Folder).where(
            Folder.user_id == user_id,
            Folder.parent_id == parent_id
        ).order_by(Folder.name)
        
        result = await self.db.execute(stmt)
        folders = result.scalars().all()
        
        tree = []
        for folder in folders:
            children = await self.get_folder_tree(user_id, folder.id)
            tree.append({
                'id': folder.id,
                'name': folder.name,
                'parent_id': folder.parent_id,
                'children': children
            })
        
        return tree
