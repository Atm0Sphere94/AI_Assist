#!/bin/bash

# =============================================================================
# AI Jarvis - Configuration Wizard
# =============================================================================
# Step 3: Interactive wizard for collecting user configuration
# =============================================================================

set -e

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

log_step "Шаг 3: Мастер конфигурации"

# Initialize configuration
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
CONFIG_FILE="$PROJECT_ROOT/.env"

if [ -f "$CONFIG_FILE" ] && [ "$FORCE_RECONFIG" != "true" ]; then
    log_warning "Файл конфигурации уже существует"
    if prompt_yes_no "Переконфигурировать?" "n"; then
        backup_file "$CONFIG_FILE"
    else
        log_info "Используем существующую конфигурацию"
        exit 0
    fi
fi

log_info "Этот мастер соберет необходимую информацию для установки"
echo ""

# =============================================================================
# Domain Configuration (Optional)
# =============================================================================

log_info "Конфигурация домена (опционально для локальной разработки)"
if prompt_yes_no "Настроить домен для production?" "n"; then
    PRODUCTION_MODE=true
    
    while true; do
        prompt_input "Введите ваш домен (например, example.com)" "" DOMAIN
        if validate_domain "$DOMAIN"; then
            break
        else
            log_error "Неверный формат домена"
        fi
    done
    
    while true; do
        prompt_input "Введите email для SSL сертификатов" "" ACME_EMAIL
        if validate_email "$ACME_EMAIL"; then
            break
        else
            log_error "Неверный формат email"
        fi
    done
else
    PRODUCTION_MODE=false
    DOMAIN="localhost"
fi

# =============================================================================
# Telegram Configuration
# =============================================================================

echo ""
log_info "Конфигурация Telegram бота"
log_info "Получите токен бота здесь: https://t.me/BotFather"

while [ -z "$TELEGRAM_TOKEN" ]; do
    prompt_input "Telegram Bot Token" "" TELEGRAM_TOKEN
    if [ -z "$TELEGRAM_TOKEN" ]; then
        log_error "Токен бота не может быть пустым"
    fi
done

while [ -z "$BOT_USERNAME" ]; do
    prompt_input "Bot Username (без @)" "" BOT_USERNAME
    if [ -z "$BOT_USERNAME" ]; then
        log_error "Username бота не может быть пустым"
    fi
done

log_info "Получите ваш Telegram ID здесь: https://t.me/userinfobot"
while [ -z "$ADMIN_TELEGRAM_ID" ]; do
    prompt_input "Ваш Telegram ID (админ)" "" ADMIN_TELEGRAM_ID
    if [ -z "$ADMIN_TELEGRAM_ID" ]; then
        log_error "Telegram ID не может быть пустым"
    fi
done

# =============================================================================
# Admin Credentials
# =============================================================================

echo ""
log_info "Настройка аккаунта админа"

while [ -z "$ADMIN_USERNAME" ]; do
    prompt_input "Admin username" "admin" ADMIN_USERNAME
done

while true; do
    prompt_secure_input "Пароль админа (минимум 8 символов)" ADMIN_PASSWORD
    if [ ${#ADMIN_PASSWORD} -lt 8 ]; then
        log_error "Пароль должен быть минимум 8 символов"
        continue
    fi
    prompt_secure_input "Подтвердите пароль" ADMIN_PASSWORD_CONFIRM
    if [ "$ADMIN_PASSWORD" == "$ADMIN_PASSWORD_CONFIRM" ]; then
        break
    else
        log_error "Пароли не совпадают"
    fi
done

# =============================================================================
# AI Model Configuration
# =============================================================================

echo ""
log_info "Конфигурация AI модели"

if prompt_yes_no "Использовать OpenAI API?" "y"; then
    while [ -z "$OPENAI_KEY" ]; do
        prompt_secure_input "OpenAI API Key" OPENAI_KEY
    done
    USE_OLLAMA=false
else
    log_info "Будем использовать Ollama (локальные модели)"
    USE_OLLAMA=true
    OPENAI_KEY="sk-not-required"
fi

# =============================================================================
# Generate Secure Secrets
# =============================================================================

echo ""
log_info "Генерируем безопасные секреты..."

POSTGRES_PASSWORD=$(generate_password 32)
REDIS_PASSWORD=$(generate_password 32)
QDRANT_API_KEY=$(generate_password 32)
SECRET_KEY=$(generate_hex 32)
WEBHOOK_SECRET=$(generate_hex 16)

log_success "Секреты сгенерированы"

# =============================================================================
# Save Configuration
# =============================================================================

echo ""
log_info "Сохраняем конфигурацию..."

cat > "$CONFIG_FILE" << EOF
# AI Jarvis Configuration
# Generated on $(date)

# Production Mode
PRODUCTION=${PRODUCTION_MODE}
DOMAIN=${DOMAIN}
ACME_EMAIL=${ACME_EMAIL:-}

# Telegram
TELEGRAM_BOT_TOKEN=${TELEGRAM_TOKEN}
TELEGRAM_BOT_USERNAME=${BOT_USERNAME}
TELEGRAM_WEBHOOK_SECRET=${WEBHOOK_SECRET}
ADMIN_TELEGRAM_ID=${ADMIN_TELEGRAM_ID}

# Admin Credentials
ADMIN_USERNAME=${ADMIN_USERNAME}
ADMIN_PASSWORD=${ADMIN_PASSWORD}

# AI Models
USE_OLLAMA=${USE_OLLAMA}
OPENAI_API_KEY=${OPENAI_KEY}
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Ollama
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=dolphin-mixtral

# Database
POSTGRES_USER=jarvis
POSTGRES_PASSWORD=${POSTGRES_PASSWORD}
POSTGRES_DB=jarvis_db
DATABASE_URL=postgresql+asyncpg://jarvis:${POSTGRES_PASSWORD}@postgres:5432/jarvis_db

# Redis
REDIS_PASSWORD=${REDIS_PASSWORD}
REDIS_URL=redis://:${REDIS_PASSWORD}@redis:6379/0

# Qdrant
QDRANT_API_KEY=${QDRANT_API_KEY}
QDRANT_URL=http://qdrant:6333

# Application
SECRET_KEY=${SECRET_KEY}
DEBUG=False
LOG_LEVEL=INFO

# Celery
CELERY_BROKER_URL=redis://:${REDIS_PASSWORD}@redis:6379/0
CELERY_RESULT_BACKEND=redis://:${REDIS_PASSWORD}@redis:6379/1
EOF

log_success "Конфигурация сохранена в $CONFIG_FILE"
echo ""
