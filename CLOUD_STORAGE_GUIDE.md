# Cloud Storage Integration Guide

## Overview

AI Jarvis поддерживает интеграцию с облачными хранилищами для автоматической синхронизации и индексации документов в базу знаний. Вся обработка происходит в фоне через Celery, не перегружая основной сервер.

## Поддерживаемые хранилища

### 1. Яндекс.Диск
**Назначение**: База знаний из документов  
**Поддерживаемые форматы**: PDF, DOCX, TXT, MD, и другие

**Как получить токен:**
1. Перейдите на https://oauth.yandex.ru/
2. Зарегистрируйте приложение
3. Получите OAuth токен с правами на чтение диска
4. Используйте токен в веб-интерфейсе

### 2. iCloud Drive (через WebDAV)
**Назначение**: Синхронизация Obsidian заметок  
**Поддерживаемые форматы**: Markdown (.md), вложения (PDF, изображения)

**Как получить app-specific password:**
1. Откройте https://appleid.apple.com
2. Войдите в аккаунт
3. Перейдите в раздел "Безопасность"
4. Нажмите "Создать пароль приложения"
5. Используйте этот пароль для подключения

## Архитектура

```
┌─────────────────┐
│  Web Interface  │
│  (User Setup)   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  CloudStorage   │ ◄─── Credentials (encrypted)
│     Model       │ ◄─── Sync settings
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Celery Task    │ ◄─── Background processing
│  (sync_*_*)     │ ◄─── Progress tracking
└────────┬────────┘
         │
         ├──► Yandex Disk API
         │
         ├──► iCloud WebDAV
         │
         ▼
┌─────────────────┐
│  Document       │
│  Processing     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│   RAG Index     │ ◄─── Qdrant
│  (Qdrant/Chroma)│
└─────────────────┘
```

## Database Models

### CloudStorage
```python
- id                      # Primary key
- user_id                 # Owner
- storage_type            # yandex_disk, icloud, etc.
- name                    # User-friendly name
- access_token            # OAuth token (encrypted)
- sync_path               # Path to sync from
- sync_enabled            # On/off switch
- auto_sync               # Auto-sync on changes
- sync_interval_minutes   # Sync frequency
- process_documents       # Add to knowledge base
- file_filters            # [".pdf", ".docx"]
- exclude_patterns        # ["tmp/", "archive/"]
- last_sync_at            # Last sync timestamp
- last_sync_status        # pending/completed/failed
```

### CloudSyncJob
```python
- id                   # Primary key
- storage_id           # Reference to CloudStorage
- celery_task_id       # Background task ID
- status               # pending/in_progress/completed/failed
- total_files          # Total files found
- processed_files      # Successfully processed
- failed_files         # Failed files
- started_at           # Start time
- completed_at         # Completion time
- error_message        # Error if failed
```

### ObsidianVault
```python
- id                   # Primary key
- user_id              # Owner
- cloud_storage_id     # Reference to iCloud storage
- vault_name           # Vault name
- vault_path           # Path in iCloud
- sync_enabled         # On/off
- sync_attachments     # Include images/PDFs
- index_vault          # Add to knowledge base
- process_backlinks    # Process [[wiki-links]]
- process_tags         # Process #tags
- exclude_folders      # [".obsidian", "templates"]
```

## Background Processing

### Celery Tasks

#### 1. sync_yandex_disk
```python
@celery_app.task(name="cloud.sync_yandex_disk")
async def sync_yandex_disk(storage_id: int, job_id: int):
    """
    Синхронизация с Яндекс.Диском:
    1. Получить список файлов (рекурсивно)
    2. Скачать новые/обновленные файлы
    3. Обработать документы
    4. Добавить в RAG индекс
    5. Обновить статус
    """
```

**Особенности:**
- Работает в фоне, не блокирует API
- Отслеживает прогресс (progress bar в UI)
- Обрабатывает только разрешенные расширения
- Пропускает исключенные паттерны
- Автоматически обновляет базу знаний

#### 2. sync_obsidian_vault
```python
@celery_app.task(name="cloud.sync_obsidian_vault")
async def sync_obsidian_vault(vault_id: int, job_id: int):
    """
    Синхронизация Obsidian хранилища:
    1. Подключение к iCloud через WebDAV
    2. Список заметок (.md файлы)
    3. Извлечение метаданных (frontmatter, tags, links)
    4. Обработка wiki-links и backlinks
    5. Индексация с сохранением structure
    """
```

**Особенности:**
- Извлекает YAML frontmatter
- Распознает теги (#tag)
- Обрабатывает wiki-links ([[link]])
- Сохраняет структуру Markdown
- Индексирует вложения (optional)

#### 3. schedule_auto_sync
```python
@celery_app.task(name="cloud.schedule_auto_sync")
async def schedule_auto_sync():
    """
    Автоматическая периодическая синхронизация.
    Запускается каждый час через Celery Beat.
    """
```

## API Endpoints (To Implement)

### Storage Management

```python
# POST /api/cloud-storage/connect
{
  "storage_type": "yandex_disk",
  "name": "My Knowledge Base",
  "access_token": "...",
  "sync_path": "/Documents/Knowledge",
  "file_filters": [".pdf", ".docx", ".txt"],
  "exclude_patterns": ["tmp/", "drafts/"],
  "auto_sync": true,
  "sync_interval_minutes": 60
}

# GET /api/cloud-storage/list
# List all connected storages for current user

# POST /api/cloud-storage/{id}/sync
# Manually trigger sync

# GET /api/cloud-storage/{id}/status
# Get sync status and progress

# DELETE /api/cloud-storage/{id}
# Disconnect storage
```

### Obsidian Vault

```python
# POST /api/obsidian/connect
{
  "vault_name": "Personal Notes",
  "icloud_username": "user@icloud.com",
  "app_password": "...",
  "vault_path": "/Obsidian/PersonalVault",
  "index_vault": true,
  "process_backlinks": true,
  "exclude_folders": [".obsidian", "templates"]
}

# POST /api/obsidian/{id}/sync
# Trigger vault sync

# GET /api/obsidian/{id}/notes
# List synced notes
```

## Configuration

### Environment Variables

```bash
# File Storage
UPLOAD_DIR=/app/uploads
MAX_UPLOAD_SIZE=104857600  # 100MB

# Cloud Storage Rate Limits
YANDEX_DISK_RATE_LIMIT=10  # requests per second
ICLOUD_RATE_LIMIT=5

# Celery Workers
CELERY_WORKER_CONCURRENCY=4
CELERY_TASK_TIME_LIMIT=3600  # 1 hour max
```

### Celery Beat Schedule

```python
# celery_app.py
app.conf.beat_schedule = {
    'auto-sync-cloud-storage': {
        'task': 'cloud.schedule_auto_sync',
        'schedule': crontab(minute=0),  # Every hour
    },
}
```

## Security

### Credentials Encryption

```python
from cryptography.fernet import Fernet

def encrypt_token(token: str) -> str:
    """Encrypt OAuth token before storing in DB."""
    f = Fernet(settings.encryption_key)
    return f.encrypt(token.encode()).decode()

def decrypt_token(encrypted: str) -> str:
    """Decrypt token for API calls."""
    f = Fernet(settings.encryption_key)
    return f.decrypt(encrypted.encode()).decode()
```

> **ВАЖНО**: Всегда шифруйте токены перед сохранением в БД!

## Usage Example

### 1. Connect Yandex Disk

```python
# Via web interface or API
POST /api/cloud-storage/connect
{
  "storage_type": "yandex_disk",
  "name": "Knowledge Base",
  "access_token": "AQA...xyz",
  "sync_path": "/Knowledge",
  "file_filters": [".pdf", ".md", ".docx"],
  "auto_sync": true
}
```

### 2. Initial Sync

```python
# Manual trigger or auto-starts
POST /api/cloud-storage/1/sync

# Response
{
  "job_id": 42,
  "status": "in_progress",
  "message": "Sync started"
}
```

### 3. Monitor Progress

```python
GET /api/cloud-storage/1/status

# Response
{
  "status": "in_progress",
  "progress": {
    "current": 15,
    "total": 50,
    "percent": 30
  },
  "files": {
    "processed": 15,
    "failed": 0,
    "new": 12,
    "updated": 3
  }
}
```

### 4. Query Knowledge Base

```python
# After sync completes, use RAG agent
"Найди информацию о проекте X"
# AI will search through synced documents
```

## Performance Optimization

### Rate Limiting
- Yandex Disk: макс 10 req/s
- iCloud WebDAV: макс 5 req/s
- Используйте батчинг для массовых операций

### Batching
```python
# Process files in batches
BATCH_SIZE = 10
for i in range(0, len(files), BATCH_SIZE):
    batch = files[i:i+BATCH_SIZE]
    await process_batch(batch)
```

### Caching
```python
# Cache file hashes to avoid re-processing
if file_hash == cached_hash:
    skip_processing()
```

## Troubleshooting

### Sync Fails
1. Проверьте validity токена
2. Проверьте права доступа к папке
3. Проверьте логи Celery: `docker-compose logs -f celery_worker`

### Slow Processing
1. Увеличьте кол-во Celery workers
2. Уменьшите размер батчей
3. Добавьте фильтры для файлов

### High Memory Usage
1. Обрабатывайте файлы по одному
2. Используйте streaming для больших файлов
3. Чистите временные файлы после обработки

## Next Steps

1. Implement API endpoints
2. Add web UI for storage management
3. Implement credentials encryption
4. Add progress WebSocket for real-time updates
5. Create admin panel for monitoring jobs
6. Add support for Google Drive (future)
7. Add support for Dropbox (future)

## Example UI Flow

```
┌──────────────────────────────────────┐
│     Cloud Storage Settings          │
├──────────────────────────────────────┤
│                                      │
│  ┌────────────────────────────────┐ │
│  │  Connected Storages            │ │
│  │                                │ │
│  │  📁 Yandex Disk - Knowledge   │ │
│  │     Last sync: 5 min ago      │ │
│  │     Files: 127 | Size: 1.2GB  │ │
│  │     [Sync Now] [Settings] [×] │ │
│  │                                │ │
│  │  📝 Obsidian - Personal Notes │ │
│  │     Last sync: 1 hour ago     │ │
│  │     Notes: 342 | Synced       │ │
│  │     [Sync Now] [Settings] [×] │ │
│  └────────────────────────────────┘ │
│                                      │
│  [+ Add Cloud Storage]               │
│                                      │
└──────────────────────────────────────┘
```

---

**Интеграция с облачными хранилищами делает AI Jarvis мощным инструментом для работы с персональной базой знаний! 🚀**
