#!/bin/bash

# ==================================
# AI Jarvis - Interactive Setup Script
# ==================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Unicode symbols
CHECK="${GREEN}✓${NC}"
CROSS="${RED}✗${NC}"
ARROW="${BLUE}→${NC}"
STAR="${YELLOW}★${NC}"
INFO="${CYAN}ℹ${NC}"

# ==================================
# Helper Functions
# ==================================

print_header() {
    echo ""
    echo -e "${PURPLE}╔════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}║${NC}          ${CYAN}AI JARVIS - INTERACTIVE SETUP${NC}            ${PURPLE}║${NC}"
    echo -e "${PURPLE}║${NC}   ${YELLOW}Personal AI Assistant with Telegram & Web${NC}      ${PURPLE}║${NC}"
    echo -e "${PURPLE}╚════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

print_success() {
    echo -e "${CHECK} ${GREEN}$1${NC}"
}

print_error() {
    echo -e "${CROSS} ${RED}$1${NC}"
}

print_info() {

print_progress() {
    local current=$1
    local total=$2
    local width=50
    local percent=$((current * 100 / total))
    local filled=$((current * width / total))
    local empty=$((width - filled))
    
    printf "\r${CYAN}Progress: ["
    printf "${GREEN}%${filled}s" "" | tr ' ' '█'
    printf "${NC}%${empty}s" "" | tr ' ' '░'
    printf "${CYAN}] ${WHITE}${percent}%%${NC}"
}

spinner() {
    local pid=$1
    local delay=0.1
    local spinstr='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
    while [ "$(ps a | awk '{print $1}' | grep $pid)" ]; do
        local temp=${spinstr#?}
        printf " [${CYAN}%c${NC}]  " "$spinstr"
        local spinstr=$temp${spinstr%"$temp"}
        sleep $delay
        printf "\b\b\b\b\b\b"
    done
    printf "    \b\b\b\b"
}

# Validation functions
validate_telegram_token() {
    local token=$1
    # Telegram bot token format: 10 digits:alphanumeric string
    if [[ $token =~ ^[0-9]{8,10}:[A-Za-z0-9_-]{35}$ ]]; then
        return 0
    else
        return 1
    fi
}

validate_openai_key() {
    local key=$1
    # OpenAI key format: sk-... (legacy) or sk-proj-... (new)
    if [[ $key =~ ^sk-(proj-)?[A-Za-z0-9]{20,}$ ]]; then
        return 0
    else
        return 1
    fi
}

# Main setup function
main() {
    clear
    print_header
    
    # Check prerequisites
    print_step "Проверка системных требований"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        print_error "Docker не установлен!"
        echo -e "   ${YELLOW}Установите Docker Desktop: https://www.docker.com/products/docker-desktop${NC}"
        exit 1
    fi
    print_success "Docker установлен"
    
    # Check Docker Compose
    if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
        print_error "Docker Compose не установлен!"
        exit 1
    fi
    print_success "Docker Compose установлен"
    
    # Check if Docker is running
    if ! docker info > /dev/null 2>&1; then
        print_error "Docker не запущен!"
        echo -e "   ${YELLOW}Запустите Docker Desktop и попробуйте снова${NC}"
        exit 1
    fi
    print_success "Docker запущен"
    
    echo ""
    
    # Check if .env already exists
    if [ -f .env ]; then
        print_warning ".env файл уже существует"
        echo -n -e "   ${YELLOW}Перезаписать существующие настройки? (y/N): ${NC}"
        read -r overwrite
        if [[ ! $overwrite =~ ^[Yy]$ ]]; then
            print_info "Используем существующий .env файл"
            skip_credentials=true
        else
            skip_credentials=false
        fi
    else
        skip_credentials=false
    fi
    
    # Interactive credential input
    if [ "$skip_credentials" = false ]; then
        print_step "${LOCK} Настройка API ключей"
        
        # Telegram Bot Token
        echo -e "${BOLD}${BOT} Telegram Bot Token${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "   ${CYAN}Как получить:${NC}"
        echo -e "   1. Откройте Telegram и найдите ${WHITE}@BotFather${NC}"
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null; then
        print_success "Docker Compose is installed"
    else
        print_error "Docker Compose is not installed"
        exit 1
    fi

    # Check Node.js for frontend
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        print_success "Node.js is installed ($NODE_VERSION)"
    else
        print_warning "Node.js not found - required for frontend"
        print_info "Install from: https://nodejs.org/"
        read -p "Continue anyway? (y/n) " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            exit 1
        fi
    fi

    print_step "Step 2: Collect Configuration"

    # Create .env if doesn't exist
    if [ ! -f .env ]; then
        cp .env.example .env
        print_success "Created .env file from template"
    fi

    # Telegram Bot Token
    print_info "You can get your bot token from: ${BLUE}https://t.me/BotFather${NC}"
    read -p "Enter your Telegram Bot Token: " TELEGRAM_TOKEN
    if [ ! -z "$TELEGRAM_TOKEN" ]; then
        sed -i.bak "s|TELEGRAM_BOT_TOKEN=.*|TELEGRAM_BOT_TOKEN=$TELEGRAM_TOKEN|" .env
        print_success "Telegram bot token saved"
    fi

    # Bot Username
    read -p "Enter your Telegram Bot Username (without @): " BOT_USERNAME
    if [ ! -z "$BOT_USERNAME" ]; then
        sed -i.bak "s|TELEGRAM_BOT_USERNAME=.*|TELEGRAM_BOT_USERNAME=$BOT_USERNAME|" .env
        print_success "Bot username saved"
    fi

    # Your Telegram ID (for admin)
    print_info "Get your Telegram ID from: ${BLUE}https://t.me/userinfobot${NC}"
    read -p "Enter YOUR Telegram ID (for admin access): " ADMIN_TELEGRAM_ID
    if [ ! -z "$ADMIN_TELEGRAM_ID" ]; then
        sed -i.bak "s|YOUR_TELEGRAM_ID|$ADMIN_TELEGRAM_ID|" .env
        print_success "Admin Telegram ID saved"
    fi

    # OpenAI API Key
    print_info "Optional: For GPT-4. Get key from: ${BLUE}https://platform.openai.com/api-keys${NC}"
    read -p "Enter your OpenAI API Key (or press Enter to skip): " OPENAI_KEY
    if [ ! -z "$OPENAI_KEY" ]; then
        sed -i.bak "s|OPENAI_API_KEY=.*|OPENAI_API_KEY=$OPENAI_KEY|" .env
        print_success "OpenAI API key saved"
    fi

    # Ollama configuration
    print_info "Do you want to use Ollama (local AI models) instead of OpenAI?"
    read -p "Use Ollama? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        sed -i.bak "s|USE_OLLAMA=.*|USE_OLLAMA=true|" .env
        print_success "Ollama enabled"
        print_info "Don't forget to install Ollama and pull models:"
        print_info "  brew install ollama  # macOS"
        print_info "  ollama pull dolphin-mixtral"
    fi

    # Webhook URL (optional for production)
    read -p "Enter webhook URL (optional, for production): " WEBHOOK_URL
    if [ ! -z "$WEBHOOK_URL" ]; then
        sed -i.bak "s|TELEGRAM_WEBHOOK_URL=.*|TELEGRAM_WEBHOOK_URL=$WEBHOOK_URL|" .env
        print_success "Webhook URL saved"
    fi

    # Admin credentials
    print_step "Step 3: Admin Account Setup"
    
    print_info "Create admin account for web interface login"
    echo ""
    
    while true; do
        read -p "Enter admin username: " ADMIN_USERNAME
        if [ ! -z "$ADMIN_USERNAME" ]; then
            break
        fi
        print_error "Username cannot be empty!"
    done
    
    while true; do
        read -sp "Enter admin password: " ADMIN_PASSWORD
        echo ""
        if [ ${#ADMIN_PASSWORD} -lt 8 ]; then
            print_error "Password must be at least 8 characters!"
            continue
        fi
        read -sp "Confirm admin password: " ADMIN_PASSWORD_CONFIRM
        echo ""
        if [ "$ADMIN_PASSWORD" == "$ADMIN_PASSWORD_CONFIRM" ]; then
            break
        fi
        print_error "Passwords don't match!"
    done
    
    print_success "Admin credentials configured"
    
    print_step "Step 4: Frontend Configuration"

    if [ -d "frontend" ]; then
        # Frontend .env.local
        if [ ! -f frontend/.env.local ]; then
            cat > frontend/.env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_BOT_USERNAME=$BOT_USERNAME
NEXT_PUBLIC_ADMIN_TELEGRAM_ID=$ADMIN_TELEGRAM_ID
EOF
            print_success "Created frontend/.env.local"
        fi
        
        # Install frontend dependencies
        print_info "Installing frontend dependencies..."
        if command -v npm &> /dev/null; then
            (cd frontend && npm install > /dev/null 2>&1 &)
            spinner $!
            print_success "Frontend dependencies installed"
        else
            print_warning "npm not found - skipping frontend setup"
        fi
    else
        print_warning "Frontend directory not found - skipping"
    fi

    print_step "Step 4: Docker Setup"

    print_info "Building Docker images..."
    docker-compose build > /dev/null 2>&1 &
    spinner $!
    print_success "Docker images built"

    print_info "Starting services..."
    docker-compose up -d > /dev/null 2>&1
    print_success "Services started"

    # Wait for services to be ready
    print_info "Waiting for services to be ready..."
    sleep 10

    print_step "Step 6: Database Initialization"

    print_info "Initializing database..."
    docker-compose exec -T backend python init_db.py > /dev/null 2>&1
    print_success "Database initialized"

    print_step "Step 7: Creating Admin User"

    print_info "Creating admin user with provided credentials..."
    docker-compose exec -T backend python create_admin_user.py "$ADMIN_USERNAME" "$ADMIN_PASSWORD" $ADMIN_TELEGRAM_ID > /dev/null 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "Admin user created successfully!"
        echo ""
        print_info "Admin credentials:"
        echo -e "  Username: ${YELLOW}$ADMIN_USERNAME${NC}"
        echo -e "  Password: ${YELLOW}********${NC}"
    else
        print_warning "Admin user creation skipped (may already exist)"
    fi

    print_step "✨ Setup Complete! ✨"

    echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}║                                                            ║${NC}"
    echo -e "${GREEN}║${NC}              ${STAR}${STAR}${STAR}  УСТАНОВКА ЗАВЕРШЕНА!  ${STAR}${STAR}${STAR}${NC}              ${GREEN}${BOLD}║${NC}"
    echo -e "${GREEN}${BOLD}║                                                            ║${NC}"
    echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""

    print_success "Services are running!"
    echo ""
    echo -e "${CYAN}Access Points:${NC}"
    echo -e "  ${ARROW} Web Interface:    ${BLUE}http://localhost:3000${NC}"
    echo -e "  ${ARROW} API Documentation: ${BLUE}http://localhost:8000/docs${NC}"
    echo -e "  ${ARROW} Telegram Bot:     ${BLUE}@$BOT_USERNAME${NC}"
    echo ""

    echo -e "${CYAN}Next Steps:${NC}"
    echo -e "  1. ${ARROW} Visit ${BLUE}http://localhost:3000${NC}"
    echo -e "  2. ${ARROW} Login with:"
    echo -e "      • Telegram (via widget)"
    echo -e "      • Admin login: ${YELLOW}$ADMIN_USERNAME${NC} / ${YELLOW}********${NC}"
    echo -e "  3. ${ARROW} Start chatting with your AI assistant!"
    echo ""

    echo -e "${CYAN}Useful Commands:${NC}"
    echo -e "  ${ARROW} View logs:        ${YELLOW}docker-compose logs -f${NC}"
    echo -e "  ${ARROW} Stop services:    ${YELLOW}docker-compose down${NC}"
    echo -e "  ${ARROW} Restart:          ${YELLOW}docker-compose restart${NC}"
    echo -e "  ${ARROW} Update:           ${YELLOW}git pull && docker-compose up -d --build${NC}"
    echo ""

    print_info "For detailed documentation, see:"
    print_info "  • QUICKSTART.md"
    print_info "  • CLOUD_STORAGE_GUIDE.md"
    print_info "  • UNCENSORED_MODELS.md"
    echo ""

    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  Happy chatting with AI Jarvis! 🤖✨${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${PURPLE}${BOLD}📖 Документация:${NC}"
    echo ""
    echo -e "   ${WHITE}README.md${NC}          - Общая информация"
    echo -e "   ${WHITE}QUICKSTART.md${NC}      - Быстрый старт"
    echo -e "   ${WHITE}DEVELOPMENT.md${NC}     - Руководство разработчика"
    echo -e "   ${WHITE}NEXT_STEPS.md${NC}      - План развития проекта"
    echo ""
    echo -e "${GREEN}${BOLD}Удачи с AI Jarvis! ${ROCKET}${NC}"
    echo ""
}

# Run main function
main
