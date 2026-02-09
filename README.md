# AI Jarvis - Your Personal AI Assistant

<div align="center">

**Powerful AI assistant with Telegram bot, modern web interface, and cloud storage integration**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Python 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black)](https://nextjs.org/)

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [Architecture](#-architecture)

</div>

---

## ✨ Features

### 🤖 Dual Interface
- **Telegram Bot** - Communicate with AI via Telegram messenger
- **Web Interface** - Modern Next.js 14 app with real-time chat
- **Telegram Auth** - Secure authentication through Telegram Login Widget

### 🧠 AI Capabilities
- **Multiple AI Models**:
  - OpenAI GPT-4 (cloud-based)
  - Ollama (local, uncensored models: Dolphin Mixtral, WizardLM, OpenHermes)
- **Agentic Workflow** - LangGraph-based intelligent message routing
- **RAG (Knowledge Base)** - Vector search with PostgreSQL pgvector + Qdrant
- **Image Generation** - DALL-E 3 integration

### ☁️ Cloud Storage Integration
- **Yandex Disk** - Automatic document sync and indexing
- **iCloud Drive** - Obsidian vault synchronization via WebDAV
- **Background Processing** - Celery-powered non-blocking sync
- **15+ API Endpoints** - Full REST API for storage management

### 📋 Task Management
- Tasks, Calendar Events, Reminders
- Document upload and processing
- Knowledge base search
- Admin panel for user management

### 🎨 Modern UI/UX
- Dark theme with glassmorphism effects
- Fully responsive (mobile + desktop)
- Real-time chat with Markdown rendering
- Beautiful icons (Lucide React)

---

## 🚀 Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 18+ (for frontend)
- Telegram Bot Token ([get from @BotFather](https://t.me/BotFather))
- OpenAI API Key (optional if using Ollama)
- Your Telegram ID ([get from @userinfobot](https://t.me/userinfobot))

### Installation

```bash
# 1. Clone repository
git clone https://github.com/Atm0Sphere94/AI_Assist.git
cd AI_Assist

# 2. One-command installation
make install

# That's it! 🎉
```

The `make install` command will:
- ✅ Check system requirements
- ✅ Collect all credentials interactively
- ✅ Create configuration files
- ✅ Install frontend dependencies
- ✅ Build and start Docker containers
- ✅ Initialize database
- ✅ Create admin user automatically

### Quick Commands

```bash
make start    # Start all services
make stop     # Stop all services
make logs     # View logs
make restart  # Restart services
make help     # Show all available commands
```

### Create Admin User
│   └── config.py        # Конфигурация
├── frontend/            # Next.js приложение
├── data/                # Данные (uploads, векторная БД)
├── logs/                # Логи
└── docker-compose.yml

## API Документация

После запуска доступна по адресу: http://localhost:8000/docs

## Лицензия

MIT
