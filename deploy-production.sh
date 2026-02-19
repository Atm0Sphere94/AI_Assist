#!/bin/bash

# ===================================
# AI Jarvis - Production Deployment
# ===================================
# For VPS deployment with domain and SSL
# ===================================

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo ""
echo -e "${BLUE}🚀 AI Jarvis - Production Deployment${NC}"
echo "===================================="
echo ""

# Check if running on production server
if [ -f .env.production ]; then
    echo -e "${YELLOW}⚠️  Production .env already exists${NC}"
    read -p "Reconfigure? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Using existing configuration"
        USE_EXISTING=true
    fi
fi

if [ "$USE_EXISTING" != "true" ]; then
    echo -e "${BLUE}📝 Production Configuration${NC}"
    echo ""
    
    # Domain
    read -p "Enter your domain (e.g., example.com): " DOMAIN
    while [ -z "$DOMAIN" ]; do
        echo -e "${RED}Domain cannot be empty!${NC}"
        read -p "Enter your domain: " DOMAIN
    done
    
    # Email for Let's Encrypt
    read -p "Enter email for SSL certificates: " ACME_EMAIL
    while [ -z "$ACME_EMAIL" ]; do
        echo -e "${RED}Email cannot be empty!${NC}"
        read -p "Enter email: " ACME_EMAIL
    done
    
    # DNS Provider
    echo ""
    echo "Select DNS provider for wildcard SSL:"
    echo "  1) Cloudflare"
    echo "  2) Route53 (AWS)"
    echo "  3) DigitalOcean"
    echo "  4) Other"
    read -p "Choice (1-4): " DNS_CHOICE
    
    case $DNS_CHOICE in
        1)
            DNS_PROVIDER="cloudflare"
            read -p "Cloudflare API Email: " CF_API_EMAIL
            read -p "Cloudflare API Key: " CF_API_KEY
            ;;
        2)
            DNS_PROVIDER="route53"
            read -p "AWS Access Key ID: " AWS_ACCESS_KEY_ID
            read -p "AWS Secret Access Key: " AWS_SECRET_ACCESS_KEY
            ;;
        3)
            DNS_PROVIDER="digitalocean"
            read -p "DigitalOcean API Token: " DO_AUTH_TOKEN
            ;;
        *)
            read -p "DNS Provider name: " DNS_PROVIDER
            ;;
    esac
    
    # Telegram
    echo ""
    read -p "Telegram Bot Token: " TELEGRAM_TOKEN
    read -p "Telegram Bot Username (without @): " BOT_USERNAME
    # Remove @ if present
    BOT_USERNAME=${BOT_USERNAME//@/}
    read -p "Your Telegram ID (admin): " ADMIN_TELEGRAM_ID
    
    # OpenAI
    echo ""
    read -p "OpenAI API Key (or press Enter to skip): " OPENAI_KEY
    
    # Admin credentials
    echo ""
    read -p "Admin username: " ADMIN_USERNAME
    read -sp "Admin password: " ADMIN_PASSWORD
    echo ""
    
    # Generate secure passwords
    POSTGRES_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    REDIS_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    QDRANT_API_KEY=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
    SECRET_KEY=$(openssl rand -hex 32)
    WEBHOOK_SECRET=$(openssl rand -hex 16)
    
    # Generate Traefik auth
    TRAEFIK_PASS=$(openssl rand -base64 12)
    TRAEFIK_AUTH=$(htpasswd -nb admin "$TRAEFIK_PASS" 2>/dev/null || echo "admin:\$apr1\$hash\$here")
    
    # Create .env.production
    cat > .env.production << EOF
# Production Configuration
# Generated on $(date)

# Domain
DOMAIN=$DOMAIN
ACME_EMAIL=$ACME_EMAIL

# DNS Provider
DNS_PROVIDER=$DNS_PROVIDER
EOF

    # Also create standard .env for docker-compose if it doesn't exist or we want to overwrite
    cp .env.production .env

    # Add DNS credentials
    case $DNS_CHOICE in
        1)
            cat >> .env.production << EOF
CF_API_EMAIL=$CF_API_EMAIL
CF_API_KEY=$CF_API_KEY
EOF
            ;;
        2)
            cat >> .env.production << EOF
AWS_ACCESS_KEY_ID=$AWS_ACCESS_KEY_ID
AWS_SECRET_ACCESS_KEY=$AWS_SECRET_ACCESS_KEY
EOF
            ;;
        3)
            cat >> .env.production << EOF
DO_AUTH_TOKEN=$DO_AUTH_TOKEN
EOF
            ;;
    esac
    
    cat >> .env.production << EOF

# Traefik
TRAEFIK_AUTH=$TRAEFIK_AUTH

# Telegram
TELEGRAM_BOT_TOKEN=$TELEGRAM_TOKEN
TELEGRAM_BOT_USERNAME=$BOT_USERNAME
TELEGRAM_WEBHOOK_URL=https://api.$DOMAIN/webhook/tg
TELEGRAM_WEBHOOK_SECRET=$WEBHOOK_SECRET
ADMIN_TELEGRAM_ID=$ADMIN_TELEGRAM_ID

# OpenAI
OPENAI_API_KEY=${OPENAI_KEY:-sk-your-key-here}
OPENAI_MODEL=gpt-4-turbo-preview
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Ollama
USE_OLLAMA=false
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=dolphin-mixtral

# Database
POSTGRES_USER=jarvis
POSTGRES_PASSWORD=$POSTGRES_PASSWORD
POSTGRES_DB=jarvis_db
DATABASE_URL=postgresql+asyncpg://jarvis:$POSTGRES_PASSWORD@postgres:5432/jarvis_db

# Redis
REDIS_PASSWORD=$REDIS_PASSWORD
REDIS_URL=redis://:$REDIS_PASSWORD@redis:6379/0

# Qdrant
QDRANT_API_KEY=$QDRANT_API_KEY
QDRANT_URL=http://qdrant:6333

# Application
SECRET_KEY=$SECRET_KEY
DEBUG=False
LOG_LEVEL=INFO
PRODUCTION=true

# CORS
ALLOWED_ORIGINS=https://$DOMAIN,https://www.$DOMAIN,https://api.$DOMAIN

# Celery
CELERY_BROKER_URL=redis://:$REDIS_PASSWORD@redis:6379/0
CELERY_RESULT_BACKEND=redis://:$REDIS_PASSWORD@redis:6379/1
EOF

    echo ""
    echo -e "${GREEN}✅ Production configuration created${NC}"
    echo ""
    echo -e "${YELLOW}⚠️  IMPORTANT - Save these credentials:${NC}"
    echo ""
    echo "Traefik Dashboard:"
    echo "  URL: https://traefik.$DOMAIN"
    echo "  Username: admin"
    echo "  Password: $TRAEFIK_PASS"
    echo ""
    echo "Admin Login:"
    echo "  Username: $ADMIN_USERNAME"
    echo "  Password: [as set]"
    echo ""
fi

# Deploy
echo -e "${BLUE}🐳 Starting deployment...${NC}"
echo ""

# Build and start
docker-compose -f docker-compose.production.yml build
docker-compose -f docker-compose.production.yml up -d

# Wait for services
echo ""
echo -e "${BLUE}⏳ Waiting for services to start...${NC}"
sleep 15

# Initialize database
echo ""
echo -e "${BLUE}🗄️  Initializing database...${NC}"
docker-compose -f docker-compose.production.yml exec -T backend python init_db.py

# Create admin user
if [ ! -z "$ADMIN_USERNAME" ] && [ ! -z "$ADMIN_PASSWORD" ]; then
    echo ""
    echo -e "${BLUE}👤 Creating admin user...${NC}"
    docker-compose -f docker-compose.production.yml exec -T backend python create_admin_user.py "$ADMIN_USERNAME" "$ADMIN_PASSWORD" $ADMIN_TELEGRAM_ID
fi

# Success
echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                        ║${NC}"
echo -e "${GREEN}║  ✨ Deployment Complete! ✨            ║${NC}"
echo -e "${GREEN}║                                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

echo -e "${BLUE}Access Points:${NC}"
echo "  🌐 Web:      https://$DOMAIN"
echo "  📡 API:      https://api.$DOMAIN"
echo "  📊 Qdrant:   https://qdrant.$DOMAIN"
echo "  🔧 Traefik:  https://traefik.$DOMAIN"
echo ""

echo -e "${YELLOW}DNS Records Required:${NC}"
echo "  A    @              -> YOUR_SERVER_IP"
echo "  A    www            -> YOUR_SERVER_IP"
echo "  A    api            -> YOUR_SERVER_IP"
echo "  A    qdrant         -> YOUR_SERVER_IP"
echo "  A    traefik        -> YOUR_SERVER_IP"
echo ""

echo -e "${GREEN}Next Steps:${NC}"
echo "  1. Add DNS records above"
echo "  2. Wait for DNS propagation (~5-10 min)"
echo "  3. SSL certificates will be issued automatically"
echo "  4. Access https://$DOMAIN"
echo ""
