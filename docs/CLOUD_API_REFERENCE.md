# Cloud Storage API Quick Reference

## 🌐 API Endpoints Overview

### Cloud Storage Management

#### Connect Cloud Storage
```http
POST /api/cloud-storage/connect
Content-Type: application/json

{
  "storage_type": "yandex_disk",
  "name": "My Knowledge Base",
  "access_token": "AQA...xyz",
  "sync_path": "/Documents/Knowledge",
  "file_filters": [".pdf", ".md", ".docx"],
  "exclude_patterns": ["tmp/", "drafts/"],
  "auto_sync": true,
  "sync_interval_minutes": 60
}

Response: 200 OK
{
  "id": 1,
  "storage_type": "yandex_disk",
  "name": "My Knowledge Base",
  "sync_enabled": true,
  ...
}
```

#### List Storages
```http
GET /api/cloud-storage/list

Response: 200 OK
[
  {
    "id": 1,
    "storage_type": "yandex_disk",
    "name": "My Knowledge Base",
    "total_files_synced": 127,
    ...
  }
]
```

#### Trigger Sync
```http
POST /api/cloud-storage/1/sync

Response: 200 OK
{
  "id": 42,
  "storage_id": 1,
  "status": "in_progress",
  "total_files": 0,
  "processed_files": 0
}
```

#### Get Sync Status
```http
GET /api/cloud-storage/1/status

Response: 200 OK
{
  "storage": {...},
  "current_job": {
    "id": 42,
    "status": "in_progress",
    "total_files": 50,
    "processed_files": 15
  },
  "progress": {
    "current": 15,
    "total": 50,
    "percent": 30,
    "files": {
      "processed": 15,
      "failed": 0,
      "new": 12
    }
  }
}
```

#### Update Settings
```http
PUT /api/cloud-storage/1
Content-Type: application/json

{
  "sync_enabled": true,
  "auto_sync": false,
  "sync_interval_minutes": 120
}
```

#### Disconnect Storage
```http
DELETE /api/cloud-storage/1

Response: 200 OK
{
  "message": "Storage disconnected successfully"
}
```

#### List Sync Jobs
```http
GET /api/cloud-storage/1/jobs?limit=10

Response: 200 OK
[
  {
    "id": 42,
    "status": "completed",
    "total_files": 50,
    "processed_files": 50,
    "started_at": "2024-02-09T10:00:00",
    "completed_at": "2024-02-09T10:15:30"
  }
]
```

---

### Obsidian Vault Management

#### Connect Obsidian Vault
```http
POST /api/obsidian/connect
Content-Type: application/json

{
  "vault_name": "Personal Notes",
  "icloud_username": "user@icloud.com",
  "icloud_app_password": "abcd-efgh-ijkl-mnop",
  "vault_path": "/Obsidian/PersonalVault",
  "sync_enabled": true,
  "sync_attachments": true,
  "index_vault": true,
  "process_backlinks": true,
  "exclude_folders": [".obsidian", "templates"]
}

Response: 200 OK
{
  "id": 1,
  "vault_name": "Personal Notes",
  "total_notes": 0,
  ...
}
```

#### List Vaults
```http
GET /api/obsidian/list

Response: 200 OK
[
  {
    "id": 1,
    "vault_name": "Personal Notes",
    "total_notes": 342
  }
]
```

#### Trigger Vault Sync
```http
POST /api/obsidian/1/sync

Response: 200 OK
{
  "job_id": 43,
  "status": "started",
  "message": "Vault sync started in background"
}
```

#### List Notes
```http
GET /api/obsidian/1/notes?limit=100

Response: 200 OK
[
  {
    "path": "/vault/daily/2024-02-09.md",
    "name": "2024-02-09.md",
    "size": 1024,
    "tags": ["daily", "journal"],
    "links": ["Project X", "Meeting Notes"],
    "backlinks": []
  }
]
```

#### Get Vault Graph
```http
GET /api/obsidian/1/graph

Response: 200 OK
{
  "nodes": [
    {"id": 1, "label": "Project X", "tags": ["project"]},
    {"id": 2, "label": "Meeting Notes", "tags": ["notes"]}
  ],
  "edges": [
    {"source": 1, "target": 2, "type": "link"}
  ],
  "total_nodes": 342,
  "total_edges": 587
}
```

#### Update Vault
```http
PUT /api/obsidian/1
Content-Type: application/json

{
  "sync_enabled": true,
  "sync_attachments": false
}
```

#### Disconnect Vault
```http
DELETE /api/obsidian/1

Response: 200 OK
{
  "message": "Vault disconnected successfully"
}
```

---

## 🧪 Testing with curl

### Connect Yandex Disk
```bash
curl -X POST http://localhost:8000/api/cloud-storage/connect \
  -H "Content-Type: application/json" \
  -d '{
    "storage_type": "yandex_disk",
    "name": "Test Storage",
    "access_token": "YOUR_TOKEN",
    "sync_path": "/",
    "file_filters": [".pdf", ".md"],
    "auto_sync": true
  }'
```

### Trigger Sync
```bash
curl -X POST http://localhost:8000/api/cloud-storage/1/sync
```

### Check Status
```bash
curl http://localhost:8000/api/cloud-storage/1/status
```

---

## 📊 API Documentation

После запуска сервера, автоматически сгенерированная документация доступна:

- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc

---

## 🔄 Background Tasks Flow

```
User Request → API Endpoint → Create CloudSyncJob
                                     ↓
                            Celery Task (async)
                                     ↓
                        ┌────────────┴────────────┐
                        │                         │
                  Yandex Disk              Obsidian Vault
                   Download                   Download
                        │                         │
                        └────────────┬────────────┘
                                     ↓
                             Process Documents
                                     ↓
                              Index in RAG
                                     ↓
                           Update Job Status
```

---

## ⚡ Real-time Progress (WebSocket - To Implement)

```javascript
// Future: WebSocket for real-time progress
const ws = new WebSocket('ws://localhost:8000/ws/sync/1');
ws.onmessage = (event) => {
  const progress = JSON.parse(event.data);
  console.log(`Progress: ${progress.percent}%`);
};
```

---

## 🔐 Security Notes

1. **Encryption**: Tokens должны шифроваться перед сохранением в БД
2. **Authentication**: Добавить JWT auth для production
3. **Rate Limiting**: Ограничить количество запросов
4. **Validation**: Проверять права доступа к storage

---

## 📝 Example Usage Scenarios

### Scenario 1: Initial Setup
```bash
# 1. Connect storage
POST /api/cloud-storage/connect

# 2. Trigger first sync
POST /api/cloud-storage/1/sync

# 3. Monitor progress
GET /api/cloud-storage/1/status

# 4. View sync history
GET /api/cloud-storage/1/jobs
```

### Scenario 2: Obsidian Integration
```bash
# 1. Connect vault
POST /api/obsidian/connect

# 2. Sync vault
POST /api/obsidian/1/sync

# 3. View notes
GET /api/obsidian/1/notes

# 4. Visualize connections
GET /api/obsidian/1/graph
```

---

## 🐛 Error Responses

```json
// 400 Bad Request
{
  "detail": "Invalid Yandex Disk credentials"
}

// 404 Not Found
{
  "detail": "Storage not found"
}

// 409 Conflict
{
  "detail": "Sync already in progress"
}
```

---

**Полная интеграция облачных хранилищ готова! 🎉**
