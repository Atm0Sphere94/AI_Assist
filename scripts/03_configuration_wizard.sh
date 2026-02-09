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

log_step "Step 3: Configuration Wizard"

# Initialize configuration
CONFIG_FILE="../.env"

if [ -f "$CONFIG_FILE" ] && [ "$FORCE_RECONFIG" != "true" ]; then
    log_warning "Configuration file already exists"
    if prompt_yes_no "Reconfigure?" "n"; then
        backup_file "$CONFIG_FILE"
    else
        log_info "Using existing configuration"
        exit 0
    fi
fi

log_info "This wizard will collect the necessary information for setup"
echo ""

# =============================================================================
# Domain Configuration (Optional)
# =============================================================================

log_info "Domain Configuration (optional for local development)"
if prompt_yes_no "Configure domain for production deployment?" "n"; then
    PRODUCTION_MODE=true
    
    while true; do
        prompt_input "Enter your domain (e.g., example.com)" "" DOMAIN
        if validate_domain "$DOMAIN"; then
            break
        else
            log_error "Invalid domain format"
        fi
    done
    
    while true; do
        prompt_input "Enter email for SSL certificates" "" ACME_EMAIL
        if validate_email "$ACME_EMAIL"; then
            break
        else
            log_error "Invalid email format"
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
log_info "Telegram Bot Configuration"
log_info "Get your bot token from: https://t.me/BotFather"

while [ -z "$TELEGRAM_TOKEN" ]; do
    prompt_input "Telegram Bot Token" "" TELEGRAM_TOKEN
    if [ -z "$TELEGRAM_TOKEN" ]; then
        log_error "Bot token cannot be empty"
    fi
done

while [ -z "$BOT_USERNAME" ]; do
    prompt_input "Bot Username (without @)" "" BOT_USERNAME
    if [ -z "$BOT_USERNAME" ]; then
        log_error "Bot username cannot be empty"
    fi
done

log_info "Get your Telegram ID from: https://t.me/userinfobot"
while [ -z "$ADMIN_TELEGRAM_ID" ]; do
    prompt_input "Your Telegram ID (admin)" "" ADMIN_TELEGRAM_ID
    if [ -z "$ADMIN_TELEGRAM_ID" ]; then
        log_error "Telegram ID cannot be empty"
    fi
done

# =============================================================================
# Admin Credentials
# =============================================================================

echo ""
log_info "Admin Account Setup"

while [ -z "$ADMIN_USERNAME" ]; do
    prompt_input "Admin username" "admin" ADMIN_USERNAME
done

while true; do
    prompt_secure_input "Admin password (min 8 characters)" ADMIN_PASSWORD
    if [ ${#ADMIN_PASSWORD} -lt 8 ]; then
        log_error "Password must be at least 8 characters"
        continue
    fi
    prompt_secure_input "Confirm admin password" ADMIN_PASSWORD_CONFIRM
    if [ "$ADMIN_PASSWORD" == "$ADMIN_PASSWORD_CONFIRM" ]; then
        break
    else
        log_error "Passwords don't match"
    fi
done

# =============================================================================
# AI Model Configuration
# =============================================================================

echo ""
log_info "AI Model Configuration"

if prompt_yes_no "Use OpenAI API?" "y"; then
    while [ -z "$OPENAI_KEY" ]; do
        prompt_secure_input "OpenAI API Key" OPENAI_KEY
    done
    USE_OLLAMA=false
else
    log_info "Will use Ollama (local models)"
    USE_OLLAMA=true
    OPENAI_KEY="sk-not-required"
fi

# =============================================================================
# Generate Secure Secrets
# =============================================================================

echo ""
log_info "Generating secure secrets..."

POSTGRES_PASSWORD=$(generate_password 32)
REDIS_PASSWORD=$(generate_password 32)
QDRANT_API_KEY=$(generate_password 32)
SECRET_KEY=$(generate_hex 32)
WEBHOOK_SECRET=$(generate_hex 16)

log_success "Secrets generated"

# =============================================================================
# Save Configuration
# =============================================================================

echo ""
log_info "Saving configuration..."

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

log_success "Configuration saved to $CONFIG_FILE"
echo ""
