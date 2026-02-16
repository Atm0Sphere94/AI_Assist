"""Celery tasks for cloud storage synchronization."""
import logging
import asyncio
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
def sync_yandex_disk(
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
    asyncio.run(_sync_yandex_disk_async(self, storage_id, job_id))


async def _sync_yandex_disk_async(
    task_instance,
    storage_id: int,
    job_id: int
):
    """Async implementation of Yandex Disk sync."""
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
            # Initialize counters if None
            job.new_files = job.new_files or 0
            job.failed_files = job.failed_files or 0
            job.processed_files = job.processed_files or 0
            job.total_files = job.total_files or 0
            
            # Ensure storage status reflects this (in case triggered automatically)
            storage.last_sync_status = SyncStatus.IN_PROGRESS
            
            await db.commit()
            
            # Initialize Yandex Disk service
            yd_service = YandexDiskService(storage.access_token)
            
            # Stream files and process as discovered
            total_discovered = 0
            processed = 0
            
            async for file_info in yd_service.stream_files_recursively(
                path=storage.sync_path,
                file_extensions=storage.file_filters,
                exclude_patterns=storage.exclude_patterns,
                included_paths=storage.included_paths
            ):
                total_discovered += 1
                
                # Skip image files - they don't contain searchable text
                file_ext = os.path.splitext(file_info['name'])[1].lower()
                if file_ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.svg', '.webp']:
                    logger.info(f"Skipping image file: {file_info['name']}")
                    continue
                
                # Update total_files every 10 discovered files for progress visibility
                if total_discovered % 10 == 0:
                    job.total_files = total_discovered
                    await db.commit()
                    logger.info(f"Discovered {total_discovered} files so far...")
                
                try:
                    # Create file operation record
                    file_op = CloudFileOperation(
                        sync_job_id=job_id,
                        file_path=file_info['path'],
                        file_name=file_info['name'],
                        file_size=file_info.get('size', 0),
                        file_hash=file_info.get('md5'),
                        operation_type='check',
                        status=SyncStatus.IN_PROGRESS
                    )
                    db.add(file_op)
                    await db.commit()
                    
                    # Check if file has changed
                    doc_service = DocumentService(db)
                    existing_doc = await doc_service.get_document_by_filename(
                        user_id=storage.user_id, 
                        filename=file_info['name']
                    )
                    
                    remote_hash = file_info.get('md5')
                    
                    if existing_doc and existing_doc.file_hash == remote_hash:
                        # File unchanged
                        file_op.operation_type = 'skip'
                        file_op.status = SyncStatus.COMPLETED
                        file_op.document_id = existing_doc.id
                        processed += 1
                        job.processed_files = processed
                        logger.info(f"Skipping unchanged file: {file_info['name']}")
                    
                    else:
                        # File is new or changed
                        file_op.operation_type = 'download'
                        
                        # Download file
                        local_path = f"{settings.upload_dir}/yandex_disk/{storage.user_id}/{file_info['name']}"
                        success = await yd_service.download_file(
                            file_info['path'],
                            local_path
                        )
                        
                        if success and storage.process_documents:
                            # Process document (add to knowledge base)
                            rag_service = RAGService(db)
                            
                            # Get or create folder hierarchy
                            from services.folder_service import FolderService
                            folder_service = FolderService(db)
                            folder_path = os.path.dirname(file_info['path'])
                            folder = await folder_service.get_or_create_folder_hierarchy(
                                user_id=storage.user_id,
                                path=folder_path
                            )
                            
                            if existing_doc:
                                # Update existing document
                                document = await doc_service.update_document(
                                    existing_doc.id,
                                    file_hash=remote_hash,
                                    file_size=file_info.get('size', 0),
                                    updated_at=datetime.utcnow(),
                                    is_indexed=False,  # Force re-indexing
                                    folder_id=folder.id  # Update folder
                                )
                                job.updated_files += 1
                            else:
                                # Create new document
                                document = await doc_service.create_document(
                                    user_id=storage.user_id,
                                    file_path=local_path,
                                    original_filename=file_info['name'],
                                    file_hash=remote_hash,
                                    folder_id=folder.id  # Assign to folder
                                )
                                job.new_files += 1
                            
                            # Index in RAG
                            await rag_service.index_document(document.id)
                            
                            file_op.document_id = document.id
                            file_op.is_processed = True
                            file_op.is_indexed = True
                        
                        file_op.status = SyncStatus.COMPLETED
                        processed += 1
                        job.processed_files = processed
                    
                    # Update progress
                    task_instance.update_state(
                        state='PROGRESS',
                        meta={'current': processed, 'total': total_discovered}
                    )
                    
                except Exception as e:
                    logger.error(f"Error processing file {file_info['path']}: {e}")
                    file_op.status = SyncStatus.FAILED
                    file_op.error_message = str(e)
                    job.failed_files += 1
                
                # Commit progress periodically (every 5 processed) for UI updates
                if processed % 5 == 0:
                    job.processed_files = processed
                    await db.commit()
                    logger.info(f"Progress: {processed}/{total_discovered} files processed")
            
            # Final update after streaming completes
            job.total_files = total_discovered
            job.processed_files = processed
            await db.commit()
            logger.info(f"Streaming completed: discovered {total_discovered}, processed {processed} files")
            
            # Complete job
            job.status = SyncStatus.COMPLETED
            job.completed_at = datetime.utcnow()
            
            # Update storage stats
            storage.last_sync_at = datetime.utcnow()
            storage.last_sync_status = SyncStatus.COMPLETED
            storage.total_files_synced = job.total_files
            storage.total_files_processed = job.new_files
            
            await db.commit()
            
            logger.info(f"Yandex Disk sync completed: {processed}/{total_discovered} files")
            
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
def sync_obsidian_vault(
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
    asyncio.run(_sync_obsidian_vault_async(self, vault_id, job_id))


async def _sync_obsidian_vault_async(
    task_instance,
    vault_id: int,
    job_id: int
):
    """Async implementation of Obsidian vault sync."""
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
                    
                    task_instance.update_state(
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
def schedule_auto_sync():
    """
    Scheduled task to trigger auto-sync for enabled storages.
    Runs every hour via Celery Beat.
    """
    asyncio.run(_schedule_auto_sync_async())


async def _schedule_auto_sync_async():
    """Async implementation of auto-sync scheduler."""
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
