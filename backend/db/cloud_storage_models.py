"""Extended database models for cloud storage integration."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON, Enum
from sqlalchemy.orm import relationship
import enum

from db.models import Base


class CloudStorageType(str, enum.Enum):
    """Supported cloud storage types."""
    YANDEX_DISK = "yandex_disk"
    ICLOUD = "icloud"
    GOOGLE_DRIVE = "google_drive"  # Future
    DROPBOX = "dropbox"  # Future


class SyncStatus(str, enum.Enum):
    """Synchronization status."""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    PAUSED = "paused"


class CloudStorage(Base):
    """Cloud storage connections for users."""
    __tablename__ = "cloud_storages"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Storage configuration
    storage_type = Column(Enum(CloudStorageType), nullable=False)
    name = Column(String(255), nullable=False)  # User-friendly name
    
    # Authentication
    access_token = Column(Text, nullable=True)  # Encrypted
    refresh_token = Column(Text, nullable=True)  # Encrypted
    credentials_encrypted = Column(Text, nullable=True)  # General encrypted credentials
    
    # Sync settings
    sync_path = Column(String(1000), default="/")  # Path to sync from
    included_paths = Column(JSON, default=["/"])  # List of paths to sync (selective sync)
    sync_enabled = Column(Boolean, default=True)
    auto_sync = Column(Boolean, default=True)  # Auto-sync on changes
    sync_interval_minutes = Column(Integer, default=60)  # Sync interval
    
    # Processing settings
    process_documents = Column(Boolean, default=True)  # Add to knowledge base
    file_filters = Column(JSON, nullable=True)  # File extensions to process
    exclude_patterns = Column(JSON, nullable=True)  # Patterns to exclude
    
    # Status
    last_sync_at = Column(DateTime, nullable=True)
    last_sync_status = Column(Enum(SyncStatus), default=SyncStatus.PENDING)
    last_error = Column(Text, nullable=True)
    total_files_synced = Column(Integer, default=0)
    total_files_processed = Column(Integer, default=0)
    
    # Metadata
    meta_data = Column(JSON, nullable=True)  # Renamed from metadata (SQLAlchemy reserved)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="cloud_storages")
    sync_jobs = relationship("CloudSyncJob", back_populates="storage", cascade="all, delete-orphan")


class CloudSyncJob(Base):
    """Background synchronization jobs."""
    __tablename__ = "cloud_sync_jobs"
    
    id = Column(Integer, primary_key=True, index=True)
    storage_id = Column(Integer, ForeignKey("cloud_storages.id"), nullable=False)
    
    # Job details
    celery_task_id = Column(String(255), nullable=True)  # Celery task ID
    status = Column(Enum(SyncStatus), default=SyncStatus.PENDING)
    
    # Progress
    total_files = Column(Integer, default=0)
    processed_files = Column(Integer, default=0)
    failed_files = Column(Integer, default=0)
    new_files = Column(Integer, default=0)
    updated_files = Column(Integer, default=0)
    
    # Timing
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)
    
    # Error tracking
    error_message = Column(Text, nullable=True)
    error_details = Column(JSON, nullable=True)
    
    # Metadata
    meta_data = Column(JSON, nullable=True)  # Renamed from metadata (SQLAlchemy reserved)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    storage = relationship("CloudStorage", back_populates="sync_jobs")
    file_operations = relationship("CloudFileOperation", back_populates="sync_job", cascade="all, delete-orphan")


class CloudFileOperation(Base):
    """Individual file operations during sync."""
    __tablename__ = "cloud_file_operations"
    
    id = Column(Integer, primary_key=True, index=True)
    sync_job_id = Column(Integer, ForeignKey("cloud_sync_jobs.id"), nullable=False)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=True)  # If processed
    
    # File details
    file_path = Column(String(1000), nullable=False)
    file_name = Column(String(500), nullable=False)
    file_size = Column(Integer, nullable=True)
    file_hash = Column(String(64), nullable=True)  # MD5 or SHA256
    
    # Operation
    operation_type = Column(String(20), nullable=False)  # download, process, index, skip
    status = Column(Enum(SyncStatus), default=SyncStatus.PENDING)
    
    # Processing
    is_processed = Column(Boolean, default=False)
    is_indexed = Column(Boolean, default=False)
    
    # Error tracking
    error_message = Column(Text, nullable=True)
    
    # Metadata
    meta_data = Column(JSON, nullable=True)  # Renamed from metadata (SQLAlchemy reserved)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    sync_job = relationship("CloudSyncJob", back_populates="file_operations")
    document = relationship("Document")


class ObsidianVault(Base):
    """Obsidian vault configurations for iCloud sync."""
    __tablename__ = "obsidian_vaults"
    
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    cloud_storage_id = Column(Integer, ForeignKey("cloud_storages.id"), nullable=True)
    
    # Vault settings
    vault_name = Column(String(255), nullable=False)
    vault_path = Column(String(1000), nullable=False)  # Path in iCloud
    
    # Sync settings
    sync_enabled = Column(Boolean, default=True)
    sync_attachments = Column(Boolean, default=True)
    
    # Processing settings
    index_vault = Column(Boolean, default=True)  # Add to knowledge base
    preserve_markdown = Column(Boolean, default=True)
    process_backlinks = Column(Boolean, default=True)
    process_tags = Column(Boolean, default=True)
    
    # Filters
    include_folders = Column(JSON, nullable=True)  # Folders to include
    exclude_folders = Column(JSON, nullable=True)  # Folders to exclude (e.g., .obsidian, templates)
    
    # Status
    last_sync_at = Column(DateTime, nullable=True)
    total_notes = Column(Integer, default=0)
    
    # Metadata
    meta_data = Column(JSON, nullable=True)  # Renamed from metadata (SQLAlchemy reserved)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = relationship("User", backref="obsidian_vaults")
    cloud_storage = relationship("CloudStorage")
