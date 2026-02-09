"""Quick start guide for getting the bot running."""

# Quick Start Guide

## Prerequisites

1. **Docker & Docker Compose** installed
2. **Telegram Bot Token** from @BotFather
3. **OpenAI API Key** from platform.openai.com

## Step-by-Step Setup

### 1. Get Your API Keys

#### Telegram Bot Token
1. Open Telegram and search for @BotFather
2. Send `/newbot`
3. Follow the instructions
4. Copy your bot token (looks like: `1234567890:ABCdefGHIjklMNOpqrsTUVwxyz`)

#### OpenAI API Key
1. Go to platform.openai.com
2. Sign up or log in
3. Go to API Keys section
4. Create new secret key
5. Copy it (starts with `sk-`)

### 2. Configure Environment

```bash
# Clone or navigate to project
cd AI_Jarvis

# Copy environment template
cp .env.example .env

# Edit .env file
nano .env  # or use any text editor
```

**Required changes in .env:**
```env
TELEGRAM_BOT_TOKEN=YOUR_BOT_TOKEN_HERE
OPENAI_API_KEY=YOUR_OPENAI_KEY_HERE
```

**Optional but recommended:**
```env
SECRET_KEY=generate_random_strong_key_here
OPENAI_MODEL=gpt-4-turbo-preview  # or gpt-3.5-turbo for cheaper option
```

### 3. Start the Application

```bash
# Make setup script executable (macOS/Linux)
chmod +x setup.sh

# Run setup
./setup.sh
```

Or manually:
```bash
docker-compose up -d
```

### 4. Initialize Database

```bash
# Wait for containers to start (about 10 seconds)
sleep 10

# Initialize database
docker exec -it ai_jarvis_backend python init_db.py
```

### 5. Test Your Bot

1. Open Telegram
2. Find your bot by username (from BotFather)
3. Send `/start`
4. You should receive a welcome message!

### 6. Try Some Commands

```
/start - Start the bot
/help - Show help message
/menu - Show main menu

Or just chat naturally:
"Создай задачу: купить молоко"
"Напомни мне завтра в 10:00 позвонить маме"
"Привет! Как дела?"
```

## Troubleshooting

### Bot doesn't respond

1. Check logs:
```bash
docker-compose logs -f backend
```

2. Verify services are running:
```bash
docker-compose ps
```

3. Check if database is initialized:
```bash
docker exec -it ai_jarvis_postgres psql -U jarvis -d ai_jarvis -c "\dt"
```

### "Webhook" errors

For local development, you might want to use polling instead of webhooks:

In `backend/telegram/bot.py`, modify webhook setup to skip it for local dev.

Or, use ngrok for webhook:
```bash
ngrok http 8000
# Update TELEGRAM_WEBHOOK_URL in .env with ngrok URL
```

### Permission errors with Docker

```bash
# macOS/Linux
sudo chmod -R 777 data/
```

### Database connection errors

```bash
# Restart PostgreSQL
docker-compose restart postgres

# Check PostgreSQL logs
docker-compose logs postgres
```

## Next Steps

- Read [DEVELOPMENT.md](DEVELOPMENT.md) for advanced features
- Check [README.md](README.md) for full documentation
- Explore the codebase in `backend/`

## Need Help?

Check the logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f celery_worker
```

Stop everything:
```bash
docker-compose down
```

Complete reset (deletes all data):
```bash
docker-compose down -v
```
