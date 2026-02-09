"""Celery tasks for cloud storage synchronization."""
import logging
from datetime import datetime
from celery import Task
from sqlalchemy import select

from celery_app import celery_app
from db import async_session_factory
from db.cloud_storage_models import (
    CloudStorage,
    CloudSyncJob,
    CloudFileOperation,
    CloudStorageType,
    SyncStatus,
    ObsidianVault
)
from services.yandex_disk_service import YandexDiskService
from services.icloud_service import ObsidianSyncService
from services.document_service import DocumentService
from services.rag_service import RAGService
from config import settings

logger = logging.getLogger(__name__)


class CallbackTask(Task):
    """Base task with progress tracking."""
    
    def update_sync_job_progress(
        self,
        job_id: int,
        processed: int,
        total: int,
        status: SyncStatus = None
    ):
        """Update sync job progress."""
        # This will be called from sync tasks
        pass


@celery_app.task(name="cloud.sync_yandex_disk", base=CallbackTask, bind=True)
async def sync_yandex_disk(
    self,
    storage_id: int,
    job_id: int
):
    """
    Synchronize files from Yandex Disk.
    
    Args:
        storage_id: CloudStorage ID
        job_id: CloudSyncJob ID
    """
    async with async_session_factory() as db:
        try:
            # Get storage and job
            storage = await db.get(CloudStorage, storage_id)
            job = await db.get(CloudSyncJob, job_id)
            
            if not storage or not job:
                logger.error(f"Storage or job not found: {storage_id}, {job_id}")
                return
            
            # Update job status
            job.status = SyncStatus.IN_PROGRESS
            job.started_at = datetime.utcnow()
            await db.commit()
            
            # Initialize Yandex Disk service
            yd_service = YandexDiskService(storage.access_token)
            
            # Get list of files
            files = await yd_service.list_files_recursively(
                path=storage.sync_path,
                file_extensions=storage.file_filters,
                exclude_patterns=storage.exclude_patterns
            )
            
            job.total_files = len(files)
            await db.commit()
            
            # Process each file
            processed = 0
            for file_info in files:
                try:
                    # Create file operation record
                    file_op = CloudFileOperation(
                        sync_job_id=job_id,
                        file_path=file_info['path'],
                        file_name=file_info['name'],
                        file_size=file_info.get('size', 0),
                        operation_type='download',
                        status=SyncStatus.IN_PROGRESS
                    )
                    db.add(file_op)
                    await db.commit()
                    
                    # Download file
                    local_path = f"{settings.upload_dir}/yandex_disk/{storage.user_id}/{file_info['name']}"
                    success = await yd_service.download_file(
                        file_info['path'],
                        local_path
                    )
                    
                    if success and storage.process_documents:
                        # Process document (add to knowledge base)
                        doc_service = DocumentService(db)
                        rag_service = RAGService(db)
                        
                        # Create document record
                        document = await doc_service.create_document(
                            user_id=storage.user_id,
                            file_path=local_path,
                            original_filename=file_info['name']
                        )
                        
                        # Index in RAG
                        await rag_service.index_document(document.id)
                        
                        file_op.document_id = document.id
                        file_op.is_processed = True
                        file_op.is_indexed = True
                        job.new_files += 1
                    
                    file_op.status = SyncStatus.COMPLETED
                    processed += 1
                    job.processed_files = processed
                    
                    # Update progress
                    self.update_state(
                        state='PROGRESS',
                        meta={'current': processed, 'total': len(files)}
                    )
                    
                except Exception as e:
                    logger.error(f"Error processing file {file_info['path']}: {e}")
                    file_op.status = SyncStatus.FAILED
                    file_op.error_message = str(e)
                    job.failed_files += 1
                
                await db.commit()
            
            # Complete job
            job.status = SyncStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            
            # Update storage stats
            storage.last_sync_at = datetime.utcnow()
            storage.last_sync_status = SyncStatus.COMPLETED
            storage.total_files_synced = job.total_files
            storage.total_files_processed = job.new_files
            
            await db.commit()
            
            logger.info(f"Yandex Disk sync completed: {processed}/{len(files)} files")
            
        except Exception as e:
            logger.error(f"Error in Yandex Disk sync: {e}", exc_info=True)
            job.status = SyncStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            
            storage.last_sync_status = SyncStatus.FAILED
            storage.last_error = str(e)
            
            await db.commit()
            raise


@celery_app.task(name="cloud.sync_obsidian_vault", base=CallbackTask, bind=True)
async def sync_obsidian_vault(
    self,
    vault_id: int,
    job_id: int
):
    """
    Synchronize Obsidian vault from iCloud.
    
    Args:
        vault_id: ObsidianVault ID
        job_id: CloudSyncJob ID
    """
    async with async_session_factory() as db:
        try:
            # Get vault and associated storage
            vault = await db.get(ObsidianVault, vault_id)
            storage = await db.get(CloudStorage, vault.cloud_storage_id)
            job = await db.get(CloudSyncJob, job_id)
            
            if not vault or not storage or not job:
                logger.error("Vault, storage, or job not found")
                return
            
            # Update job
            job.status = SyncStatus.IN_PROGRESS
            job.started_at = datetime.utcnow()
            await db.commit()
            
            # Decrypt credentials
            # In production, use proper encryption
            username = storage.metadata.get('icloud_username')
            app_password = storage.credentials_encrypted
            
            # Initialize Obsidian service
            obsidian_service = ObsidianSyncService(
                username=username,
                app_password=app_password,
                vault_path=vault.vault_path
            )
            
            # List notes
            notes = obsidian_service.list_vault_notes(
                include_attachments=vault.sync_attachments,
                exclude_folders=vault.exclude_folders
            )
            
            job.total_files = len(notes)
            await db.commit()
            
            # Process notes
            processed = 0
            for note_info in notes:
                try:
                    file_op = CloudFileOperation(
                        sync_job_id=job_id,
                        file_path=note_info['path'],
                        file_name=note_info['name'],
                        file_size=note_info.get('size', 0),
                        operation_type='download',
                        status=SyncStatus.IN_PROGRESS
                    )
                    db.add(file_op)
                    await db.commit()
                    
                    # Download note
                    local_path = f"{settings.upload_dir}/obsidian/{vault.user_id}/{note_info['name']}"
                    success = obsidian_service.download_file(
                        note_info['path'],
                        local_path
                    )
                    
                    if success and vault.index_vault:
                        # Extract metadata
                        with open(local_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        
                        metadata = obsidian_service.extract_note_metadata(content)
                        
                        # Process document
                        doc_service = DocumentService(db)
                        rag_service = RAGService(db)
                        
                        document = await doc_service.create_document(
                            user_id=vault.user_id,
                            file_path=local_path,
                            original_filename=note_info['name'],
                            metadata=metadata
                        )
                        
                        # Index with Obsidian-specific processing
                        await rag_service.index_document(
                            document.id,
                            preserve_markdown=vault.preserve_markdown,
                            process_wiki_links=vault.process_backlinks
                        )
                        
                        file_op.document_id = document.id
                        file_op.is_processed = True
                        file_op.is_indexed = True
                        job.new_files += 1
                    
                    file_op.status = SyncStatus.COMPLETED
                    processed += 1
                    job.processed_files = processed
                    
                    self.update_state(
                        state='PROGRESS',
                        meta={'current': processed, 'total': len(notes)}
                    )
                    
                except Exception as e:
                    logger.error(f"Error processing note {note_info['path']}: {e}")
                    file_op.status = SyncStatus.FAILED
                    file_op.error_message = str(e)
                    job.failed_files += 1
                
                await db.commit()
            
            # Complete
            job.status = SyncStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            
            vault.last_sync_at = datetime.utcnow()
            vault.total_notes = processed
            
            await db.commit()
            
            logger.info(f"Obsidian vault sync completed: {processed}/{len(notes)} notes")
            
        except Exception as e:
            logger.error(f"Error in Obsidian sync: {e}", exc_info=True)
            job.status = SyncStatus.FAILED
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            await db.commit()
            raise


@celery_app.task(name="cloud.schedule_auto_sync")
async def schedule_auto_sync():
    """
    Scheduled task to trigger auto-sync for enabled storages.
    Runs every hour via Celery Beat.
    """
    async with async_session_factory() as db:
        # Get all storages with auto-sync enabled
        result = await db.execute(
            select(CloudStorage).where(
                CloudStorage.auto_sync == True,
                CloudStorage.sync_enabled == True
            )
        )
        storages = result.scalars().all()
        
        for storage in storages:
            # Check if sync interval has passed
            if storage.last_sync_at:
                minutes_since_sync = (datetime.utcnow() - storage.last_sync_at).total_seconds() / 60
                if minutes_since_sync < storage.sync_interval_minutes:
                    continue
            
            # Create sync job
            job = CloudSyncJob(storage_id=storage.id)
            db.add(job)
            await db.commit()
            await db.refresh(job)
            
            # Trigger appropriate sync task
            if storage.storage_type == CloudStorageType.YANDEX_DISK:
                sync_yandex_disk.delay(storage.id, job.id)
            elif storage.storage_type == CloudStorageType.ICLOUD:
                # Get associated vault
                result = await db.execute(
                    select(ObsidianVault).where(
                        ObsidianVault.cloud_storage_id == storage.id
                    )
                )
                vault = result.scalar_one_or_none()
                if vault:
                    sync_obsidian_vault.delay(vault.id, job.id)
            
            logger.info(f"Triggered auto-sync for storage {storage.id}")
