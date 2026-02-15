"""API endpoints for cloud storage management."""
from typing import List, Optional, Dict
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel

from db import get_db
from db.models import User
from db.cloud_storage_models import (
    CloudStorage,
    CloudSyncJob,
    CloudStorageType,
    SyncStatus
)
from tasks import cloud_sync_tasks
from services.yandex_disk_service import YandexDiskService

router = APIRouter(prefix="/api/cloud-storage", tags=["cloud-storage"])


# Pydantic schemas
class CloudStorageCreate(BaseModel):
    """Schema for creating cloud storage connection."""
    storage_type: CloudStorageType
    name: str
    access_token: str
    sync_path: str = "/"
    sync_enabled: bool = True
    auto_sync: bool = True
    sync_interval_minutes: int = 60
    process_documents: bool = True
    file_filters: Optional[List[str]] = None
    exclude_patterns: Optional[List[str]] = None
    included_paths: Optional[List[str]] = None
    meta_data: Optional[dict] = None


class CloudStorageResponse(BaseModel):
    """Schema for cloud storage response."""
    id: int
    storage_type: str
    name: str
    sync_path: str
    included_paths: Optional[List[str]] = None
    sync_enabled: bool
    auto_sync: bool
    sync_interval_minutes: int
    last_sync_at: Optional[str] = None
    last_sync_status: Optional[str] = None
    last_error: Optional[str] = None
    total_files_synced: int = 0
    total_files_processed: int = 0
    process_documents: bool = True
    total_files_synced: int
    total_files_processed: int
    
    class Config:
        from_attributes = True


class SyncJobResponse(BaseModel):
    """Schema for sync job response."""
    id: int
    storage_id: int
    status: str
    total_files: int
    processed_files: int
    failed_files: int
    new_files: int
    started_at: Optional[str] = None
    completed_at: Optional[str] = None
    error_message: Optional[str] = None
    
    class Config:
        from_attributes = True


class SyncStatusResponse(BaseModel):
    """Schema for detailed sync status."""
    storage: CloudStorageResponse
    current_job: Optional[SyncJobResponse] = None
    progress: Optional[dict] = None


# Dependency to get current user (placeholder - implement with auth)
async def get_current_user(db: AsyncSession = Depends(get_db)) -> User:
    """Get current authenticated user."""
    # TODO: Implement actual authentication
    # For now, return first user
    result = await db.execute(select(User).limit(1))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


@router.post("/connect", response_model=CloudStorageResponse)
async def connect_cloud_storage(
    storage_data: CloudStorageCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Connect a new cloud storage.
    
    - **storage_type**: Type of storage (yandex_disk, icloud, etc.)
    - **name**: User-friendly name
    - **access_token**: OAuth token or credentials
    - **sync_path**: Path to sync from
    """
    # Validate credentials
    if storage_data.storage_type == CloudStorageType.YANDEX_DISK:
        # Test Yandex Disk connection
        try:
            yd_service = YandexDiskService(storage_data.access_token)
            await yd_service.get_disk_info()
        except Exception as e:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Invalid Yandex Disk credentials: {str(e)}"
            )
    
    # Create storage
    storage = CloudStorage(
        user_id=current_user.id,
        storage_type=storage_data.storage_type,
        name=storage_data.name,
        access_token=storage_data.access_token,  # TODO: Encrypt
        sync_path=storage_data.sync_path,
        included_paths=storage_data.included_paths or ["/"],
        sync_enabled=storage_data.sync_enabled,
        auto_sync=storage_data.auto_sync,
        sync_interval_minutes=storage_data.sync_interval_minutes,
        process_documents=storage_data.process_documents,
        file_filters=storage_data.file_filters,
        exclude_patterns=storage_data.exclude_patterns,
        meta_data=storage_data.meta_data
    )
    
    db.add(storage)
    await db.commit()
    await db.refresh(storage)
    
    return storage


@router.get("/list-remote-files", response_model=Dict)
async def list_remote_files(
    storage_type: Optional[str] = None,
    access_token: Optional[str] = None,
    storage_id: Optional[int] = None,
    path: str = "/",
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    List files and folders in remote storage.
    
    Can use either existing storage_id OR temporary credentials (storage_type + access_token).
    This is used for the file browser UI during setup.
    """
    service = None
    
    # 1. Use existing storage if ID provided
    if storage_id:
        storage = await db.get(CloudStorage, storage_id)
        if not storage or storage.user_id != current_user.id:
            raise HTTPException(status_code=404, detail="Storage not found")
        
        if storage.storage_type == CloudStorageType.YANDEX_DISK:
            service = YandexDiskService(storage.access_token)
            
    # 2. Or use provided credentials (for setup wizard)
    elif storage_type and access_token:
        if storage_type == CloudStorageType.YANDEX_DISK:
            service = YandexDiskService(access_token)
    
    else:
        raise HTTPException(status_code=400, detail="Either storage_id or storage_type+access_token required")
        
    if not service:
        raise HTTPException(status_code=400, detail="Unsupported storage type or invalid configuration")
        
    try:
        # Fetch file list
        files = await service.list_files(path=path, limit=1000)
        
        # Simplify response for UI
        items = []
        if "_embedded" in files:
            for item in files["_embedded"]["items"]:
                if item["type"] == "dir":
                    items.append({
                        "name": item["name"],
                        "path": item["path"].replace("disk:", ""), # Normalize path
                        "type": "dir",
                        "has_subdirs": True # Assumption
                    })
        
        # Sort: directories first, then alphabetically
        items.sort(key=lambda x: x["name"])
        
        return {"items": items, "current_path": path}
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to list files: {str(e)}")


@router.get("/list", response_model=List[CloudStorageResponse])
async def list_cloud_storages(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List all cloud storages for current user."""
    result = await db.execute(
        select(CloudStorage).where(CloudStorage.user_id == current_user.id)
    )
    storages = result.scalars().all()
    return storages


@router.get("/{storage_id}", response_model=CloudStorageResponse)
async def get_cloud_storage(
    storage_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get specific cloud storage details."""
    storage = await db.get(CloudStorage, storage_id)
    
    if not storage or storage.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Storage not found")
    
    return storage


@router.post("/{storage_id}/sync", response_model=SyncJobResponse)
async def trigger_sync(
    storage_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Manually trigger synchronization for a cloud storage.
    
    Creates a background Celery task that won't block the API.
    """
    storage = await db.get(CloudStorage, storage_id)
    
    if not storage or storage.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Storage not found")
    
    if not storage.sync_enabled:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Sync is disabled for this storage"
        )
    
    # Check if there's already a running sync
    result = await db.execute(
        select(CloudSyncJob).where(
            CloudSyncJob.storage_id == storage_id,
            CloudSyncJob.status == SyncStatus.IN_PROGRESS
        )
    )
    existing_job = result.scalar_one_or_none()
    
    if existing_job:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Sync already in progress"
        )
    
    # Create sync job
    job = CloudSyncJob(storage_id=storage_id)
    db.add(job)
    await db.commit()
    await db.refresh(job)
    
    # Trigger background task
    if storage.storage_type == CloudStorageType.YANDEX_DISK:
        task = cloud_sync_tasks.sync_yandex_disk.delay(storage_id, job.id)
        job.celery_task_id = task.id
    elif storage.storage_type == CloudStorageType.ICLOUD:
        # Find associated vault
        from db.cloud_storage_models import ObsidianVault
        result = await db.execute(
            select(ObsidianVault).where(
                ObsidianVault.cloud_storage_id == storage_id
            )
        )
        vault = result.scalar_one_or_none()
        if vault:
            task = cloud_sync_tasks.sync_obsidian_vault.delay(vault.id, job.id)
            job.celery_task_id = task.id
            
    # Update storage status immediately for UI feedback
    storage.last_sync_status = SyncStatus.IN_PROGRESS
    
    await db.commit()
    
    return job


@router.get("/{storage_id}/status", response_model=SyncStatusResponse)
async def get_sync_status(
    storage_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get detailed sync status including progress.
    
    Returns:
    - Storage information
    - Current/latest sync job
    - Progress percentage if sync is running
    """
    storage = await db.get(CloudStorage, storage_id)
    
    if not storage or storage.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Storage not found")
    
    # Get latest job
    result = await db.execute(
        select(CloudSyncJob)
        .where(CloudSyncJob.storage_id == storage_id)
        .order_by(CloudSyncJob.created_at.desc())
        .limit(1)
    )
    current_job = result.scalar_one_or_none()
    
    # Calculate progress
    progress = None
    if current_job and current_job.status == SyncStatus.IN_PROGRESS:
        if current_job.total_files > 0:
            percent = int((current_job.processed_files / current_job.total_files) * 100)
            progress = {
                "current": current_job.processed_files,
                "total": current_job.total_files,
                "percent": percent,
                "files": {
                    "processed": current_job.processed_files,
                    "failed": current_job.failed_files,
                    "new": current_job.new_files
                }
            }
    
    return SyncStatusResponse(
        storage=storage,
        current_job=current_job,
        progress=progress
    )


@router.put("/{storage_id}", response_model=CloudStorageResponse)
async def update_cloud_storage(
    storage_id: int,
    sync_enabled: Optional[bool] = None,
    auto_sync: Optional[bool] = None,
    sync_interval_minutes: Optional[int] = None,
    file_filters: Optional[List[str]] = None,
    exclude_patterns: Optional[List[str]] = None,
    included_paths: Optional[List[str]] = None,
    process_documents: Optional[bool] = None,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Update cloud storage settings."""
    storage = await db.get(CloudStorage, storage_id)
    
    if not storage or storage.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Storage not found")
    
    if sync_enabled is not None:
        storage.sync_enabled = sync_enabled
    if auto_sync is not None:
        storage.auto_sync = auto_sync
    if sync_interval_minutes is not None:
        storage.sync_interval_minutes = sync_interval_minutes
    if file_filters is not None:
        storage.file_filters = file_filters
    if exclude_patterns is not None:
        storage.exclude_patterns = exclude_patterns
    if included_paths is not None:
        storage.included_paths = included_paths
    if process_documents is not None:
        storage.process_documents = process_documents
    
    await db.commit()
    await db.refresh(storage)
    
    return storage


@router.delete("/{storage_id}")
async def disconnect_cloud_storage(
    storage_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Disconnect and remove cloud storage.
    
    This will also delete all associated sync jobs and file operations.
    """
    storage = await db.get(CloudStorage, storage_id)
    
    if not storage or storage.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Storage not found")
    
    await db.delete(storage)
    await db.commit()
    
    return {"message": "Storage disconnected successfully"}


@router.get("/{storage_id}/jobs", response_model=List[SyncJobResponse])
async def list_sync_jobs(
    storage_id: int,
    limit: int = 10,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """List sync job history for a storage."""
    storage = await db.get(CloudStorage, storage_id)
    
    if not storage or storage.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Storage not found")
    
    result = await db.execute(
        select(CloudSyncJob)
        .where(CloudSyncJob.storage_id == storage_id)
        .order_by(CloudSyncJob.created_at.desc())
        .limit(limit)
    )
    jobs = result.scalars().all()
    
    return jobs
