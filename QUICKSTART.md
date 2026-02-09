# AI Jarvis Quick Setup Guide

## Prerequisites
- Your Telegram ID (get it from @userinfobot)
- Telegram Bot Token (from @BotFather)
- OpenAI API Key

## Quick Start

### 1. Clone & Setup
```bash
git clone https://github.com/YOUR_USERNAME/AI_Assist.git
cd AI_Assist
chmod +x setup.sh
./setup.sh
```

### 2. Configure Frontend
```bash
cd frontend
cp .env.local.example .env.local
```

Edit `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_BOT_USERNAME=YourBotUsername
NEXT_PUBLIC_ADMIN_TELEGRAM_ID=YOUR_TELEGRAM_ID
```

### 3. Install Frontend Dependencies
```bash
npm install
```

### 4. Start Services
```bash
cd ..
docker-compose up -d
```

### 5. Initialize Database
```bash
docker-compose exec backend python init_db.py
```

### 6. Create Admin User
First, login via Telegram or web interface, then:
```bash
docker-compose exec backend python create_admin.py YOUR_TELEGRAM_ID
```

### 7. Access Application
- **Web Interface**: http://localhost:3000
- **API Docs**: http://localhost:8000/docs
- **Telegram Bot**: @YourBotUsername

## Development

### Backend
```bash
docker-compose logs -f backend
```

### Frontend
```bash
cd frontend
npm run dev
```

Visit http://localhost:3000

## Making Admin User

```bash
# Method 1: Via script
docker-compose exec backend python create_admin.py YOUR_TELEGRAM_ID

# Method 2: Via database
docker-compose exec postgres psql -U jarvis -d jarvis_db -c \
  "UPDATE users SET is_admin = true WHERE telegram_id = YOUR_TELEGRAM_ID;"
```

## Troubleshooting

### "User not found" when creating admin
First login via Telegram bot or web interface to create the user account.

### Frontend shows connection error
Check that backend is running and API_URL is correct in `.env.local`.

### Telegram login doesn't work
1. Check `NEXT_PUBLIC_BOT_USERNAME` is correct
2. Verify bot domain is set in @BotFather
3. Clear browser cache and try again

## Architecture

```
┌─────────────┐
│   Next.js   │ (:3000) - Web Interface
│  Frontend   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   FastAPI   │ (:8000) - Backend API
│   Backend   │
└──────┬──────┘
       │
       ├──► PostgreSQL (:5432)
       ├──► Redis (:6379)
       ├──► Qdrant (:6333)
       └──► Celery Workers
```

## Useful Commands

```bash
# View logs
docker-compose logs -f

# Restart service
docker-compose restart backend

# Run migrations
docker-compose exec backend alembic upgrade head

# Access database
docker-compose exec postgres psql -U jarvis -d jarvis_db

# Clear all data
docker-compose down -v
```

## Next Steps

1. Configure cloud storage (Yandex Disk, iCloud)
2. Customize AI models
3. Add custom tools to agents
4. Deploy to production

---

**For detailed documentation, see [README.md](./README.md)**
