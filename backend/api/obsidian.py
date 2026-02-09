"""API endpoints for Obsidian vault management."""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from db import get_db
from db.models import User
from db.cloud_storage_models import (
    ObsidianVault,
    CloudStorage,
    CloudStorageType,
    CloudSyncJob
)
from tasks import cloud_sync_tasks

router = APIRouter(prefix="/api/obsidian", tags=["obsidian"])


# Pydantic schemas
class ObsidianVaultCreate(BaseModel):
    """Schema for creating Obsidian vault connection."""
    vault_name: str
    icloud_username: str
    icloud_app_password: str
    vault_path: str
    sync_enabled: bool = True
    sync_attachments: bool = True
    index_vault: bool = True
    preserve_markdown: bool = True
    process_backlinks: bool = True
    process_tags: bool = True
    include_folders: Optional[List[str]] = None
    exclude_folders: Optional[List[str]] = None


class ObsidianVaultResponse(BaseModel):
    """Schema for Obsidian vault response."""
    id: int
    vault_name: str
    vault_path: str
    sync_enabled: bool
    sync_attachments: bool
    index_vault: bool
    last_sync_at: Optional[str] = None
    total_notes: int
    
    class Config:
        from_attributes = True


class ObsidianNoteResponse(BaseModel):
    """Schema for individual note."""
    path: str
    name: str
    size: int
    tags: List[str] = []
    links: List[str] = []
    backlinks: List[str] = []


# Dependency to get current user
async def get_current_user(db: AsyncSession = Depends(get_db)) -> User:
    """Get current authenticated user."""
    # TODO: Implement actual authentication
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/connect", response_model=ObsidianVaultResponse)
async def connect_obsidian_vault(
    vault_data: ObsidianVaultCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Connect an Obsidian vault from iCloud.
    
    - **vault_name**: Name of the vault
    - **icloud_username**: Apple ID email
    - **icloud_app_password**: App-specific password from appleid.apple.com
    - **vault_path**: Path to vault in iCloud Drive
    """
    # Create iCloud storage connection
    cloud_storage = CloudStorage(
        user_id=current_user.id,
        storage_type=CloudStorageType.ICLOUD,
        name=f"iCloud - {vault_data.vault_name}",
        credentials_encrypted=vault_data.icloud_app_password,  # TODO: Encrypt
        sync_path=vault_data.vault_path,
        sync_enabled=vault_data.sync_enabled,
        meta_data={"icloud_username": vault_data.icloud_username}
    )
    
    db.add(cloud_storage)
    await db.commit()
    await db.refresh(cloud_storage)
    
    # Create Obsidian vault
    vault = ObsidianVault(
        user_id=current_user.id,
        cloud_storage_id=cloud_storage.id,
        vault_name=vault_data.vault_name,
        vault_path=vault_data.vault_path,
        sync_enabled=vault_data.sync_enabled,
        sync_attachments=vault_data.sync_attachments,
        index_vault=vault_data.index_vault,
        preserve_markdown=vault_data.preserve_markdown,
        process_backlinks=vault_data.process_backlinks,
        process_tags=vault_data.process_tags,
        include_folders=vault_data.include_folders,
        exclude_folders=vault_data.exclude_folders or [".obsidian", ".trash", "templates"]
    )
    
    db.add(vault)
    await db.commit()
    await db.refresh(vault)
    
    return vault


@router.get("/list", response_model=List[ObsidianVaultResponse])
async def list_obsidian_vaults(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all Obsidian vaults for current user."""
    result = await db.execute(
        select(ObsidianVault).where(ObsidianVault.user_id == current_user.id)
    )
    vaults = result.scalars().all()
    return vaults


@router.get("/{vault_id}", response_model=ObsidianVaultResponse)
async def get_obsidian_vault(
    vault_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get specific Obsidian vault details."""
    vault = await db.get(ObsidianVault, vault_id)
    
    if not vault or vault.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Vault not found")
    
    return vault


@router.post("/{vault_id}/sync")
async def trigger_vault_sync(
    vault_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually trigger Obsidian vault synchronization.
    
    Creates a background Celery task for processing.
    """
    vault = await db.get(ObsidianVault, vault_id)
    
    if not vault or vault.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Vault not found")
    
    if not vault.sync_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sync is disabled for this vault"
        )
    
    # Create sync job
    job = CloudSyncJob(storage_id=vault.cloud_storage_id)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    # Trigger background task
    task = cloud_sync_tasks.sync_obsidian_vault.delay(vault_id, job.id)
    job.celery_task_id = task.id
    await db.commit()
    
    return {
        "job_id": job.id,
        "status": "started",
        "message": "Vault sync started in background"
    }


@router.get("/{vault_id}/notes", response_model=List[ObsidianNoteResponse])
async def list_vault_notes(
    vault_id: int,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List notes from synced Obsidian vault.
    
    Returns notes with their metadata (tags, links, etc.)
    """
    vault = await db.get(ObsidianVault, vault_id)
    
    if not vault or vault.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Vault not found")
    
    # Get documents from this vault
    from db.models import Document
    from db.cloud_storage_models import CloudFileOperation
    
    result = await db.execute(
        select(Document)
        .join(CloudFileOperation, CloudFileOperation.document_id == Document.id)
        .join(CloudSyncJob, CloudSyncJob.id == CloudFileOperation.sync_job_id)
        .where(
            CloudSyncJob.storage_id == vault.cloud_storage_id,
            Document.file_type == "markdown"
        )
        .limit(limit)
    )
    documents = result.scalars().all()
    
    notes = []
    for doc in documents:
        meta_data = doc.meta_data or {}
        notes.append(ObsidianNoteResponse(
            path=doc.file_path,
            name=doc.original_filename,
            size=doc.file_size or 0,
            tags=meta_data.get('tags', []),
            links=meta_data.get('links', []),
            backlinks=meta_data.get('backlinks', [])
        ))
    
    return notes


@router.put("/{vault_id}", response_model=ObsidianVaultResponse)
async def update_obsidian_vault(
    vault_id: int,
    sync_enabled: Optional[bool] = None,
    sync_attachments: Optional[bool] = None,
    index_vault: Optional[bool] = None,
    exclude_folders: Optional[List[str]] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update Obsidian vault settings."""
    vault = await db.get(ObsidianVault, vault_id)
    
    if not vault or vault.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Vault not found")
    
    if sync_enabled is not None:
        vault.sync_enabled = sync_enabled
    if sync_attachments is not None:
        vault.sync_attachments = sync_attachments
    if index_vault is not None:
        vault.index_vault = index_vault
    if exclude_folders is not None:
        vault.exclude_folders = exclude_folders
    
    await db.commit()
    await db.refresh(vault)
    
    return vault


@router.delete("/{vault_id}")
async def disconnect_obsidian_vault(
    vault_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Disconnect and remove Obsidian vault.
    
    This will also remove the associated cloud storage connection.
    """
    vault = await db.get(ObsidianVault, vault_id)
    
    if not vault or vault.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Vault not found")
    
    # Delete associated cloud storage
    if vault.cloud_storage_id:
        cloud_storage = await db.get(CloudStorage, vault.cloud_storage_id)
        if cloud_storage:
            await db.delete(cloud_storage)
    
    await db.delete(vault)
    await db.commit()
    
    return {"message": "Vault disconnected successfully"}


@router.get("/{vault_id}/graph")
async def get_vault_graph(
    vault_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get graph representation of vault notes and their connections.
    
    Returns nodes (notes) and edges (links between notes).
    """
    vault = await db.get(ObsidianVault, vault_id)
    
    if not vault or vault.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Vault not found")
    
    # Get all notes
    from db.models import Document
    from db.cloud_storage_models import CloudFileOperation
    
    result = await db.execute(
        select(Document)
        .join(CloudFileOperation, CloudFileOperation.document_id == Document.id)
        .join(CloudSyncJob, CloudSyncJob.id == CloudFileOperation.sync_job_id)
        .where(
            CloudSyncJob.storage_id == vault.cloud_storage_id,
            Document.file_type == "markdown"
        )
    )
    documents = result.scalars().all()
    
    # Build graph
    nodes = []
    edges = []
    
    for doc in documents:
        meta_data = doc.meta_data or {}
        
        # Add node
        nodes.append({
            "id": doc.id,
            "label": doc.original_filename.replace('.md', ''),
            "tags": meta_data.get('tags', [])
        })
        
        # Add edges for links
        for link in meta_data.get('links', []):
            # Find target document by name
            target = next(
                (d for d in documents if d.original_filename.replace('.md', '') == link),
                None
            )
            if target:
                edges.append({
                    "source": doc.id,
                    "target": target.id,
                    "type": "link"
                })
    
    return {
        "nodes": nodes,
        "edges": edges,
        "total_nodes": len(nodes),
        "total_edges": len(edges)
    }
