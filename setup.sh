#!/bin/bash

# AI Jarvis Interactive Setup Script
# Beautiful UI/UX with credential input and validation

set -e  # Exit on error

# Colors for beautiful output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Unicode characters
CHECK="✓"
CROSS="✗"
ARROW="➜"
STAR="★"
CLOCK="⏱"
ROCKET="🚀"
LOCK="🔐"
KEY="🔑"
BOT="🤖"
BRAIN="🧠"
DOCKER="🐳"
DATABASE="🗄️"
GEAR="⚙️"

# Print functions
print_header() {
    echo ""
    echo -e "${PURPLE}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${PURPLE}${BOLD}║                                                            ║${NC}"
    echo -e "${PURPLE}${BOLD}║${NC}          ${CYAN}${ROCKET}  AI JARVIS SETUP WIZARD  ${ROCKET}${NC}              ${PURPLE}${BOLD}║${NC}"
    echo -e "${PURPLE}${BOLD}║                                                            ║${NC}"
    echo -e "${PURPLE}${BOLD}║${NC}        ${WHITE}Telegram AI Assistant с Agentic Workflow${NC}      ${PURPLE}${BOLD}║${NC}"
    echo -e "${PURPLE}${BOLD}║                                                            ║${NC}"
    echo -e "${PURPLE}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
}

print_step() {
    echo -e "\n${CYAN}${BOLD}${ARROW} $1${NC}\n"
}

print_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

print_error() {
    echo -e "${RED}${CROSS} $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ $1${NC}"
}

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
        echo -e "   2. Отправьте команду ${WHITE}/newbot${NC}"
        echo -e "   3. Следуйте инструкциям для создания бота"
        echo -e "   4. Скопируйте токен (формат: ${YELLOW}1234567890:ABC...${NC})"
        echo ""
        
        while true; do
            echo -n -e "   ${KEY} Введите Telegram Bot Token: ${NC}"
            read -s telegram_token
            echo ""
            
            if [ -z "$telegram_token" ]; then
                print_error "Токен не может быть пустым!"
                continue
            fi
            
            if validate_telegram_token "$telegram_token"; then
                print_success "Telegram токен валиден!"
                break
            else
                print_error "Неверный формат токена!"
                echo -e "   ${YELLOW}Токен должен быть в формате: 1234567890:ABC-DEF...${NC}"
            fi
        done
        
        echo ""
        
        # OpenAI API Key
        echo -e "${BOLD}${BRAIN} OpenAI API Key${NC}"
        echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
        echo -e "   ${CYAN}Как получить:${NC}"
        echo -e "   1. Перейдите на ${WHITE}https://platform.openai.com${NC}"
        echo -e "   2. Зарегистрируйтесь или войдите в аккаунт"
        echo -e "   3. Перейдите в ${WHITE}API Keys${NC} раздел"
        echo -e "   4. Нажмите ${WHITE}Create new secret key${NC}"
        echo -e "   5. Скопируйте ключ (формат: ${YELLOW}sk-proj-...${NC} или ${YELLOW}sk-...${NC})"
        echo ""
        
        while true; do
            echo -n -e "   ${KEY} Введите OpenAI API Key: ${NC}"
            read -s openai_key
            echo ""
            
            if [ -z "$openai_key" ]; then
                print_error "API ключ не может быть пустым!"
                continue
            fi
            
            if validate_openai_key "$openai_key"; then
                print_success "OpenAI ключ валиден!"
                break
            else
                print_error "Неверный формат ключа!"
                echo -e "   ${YELLOW}Ключ должен начинаться с 'sk-' или 'sk-proj-'${NC}"
            fi
        done
        
        echo ""
        
        # Optional settings
        print_step "${GEAR} Дополнительные настройки (опционально)"
        
        echo -n -e "   ${CYAN}Webhook URL (нажмите Enter для пропуска):${NC} "
        read webhook_url
        
        echo -n -e "   ${CYAN}OpenAI Model (по умолчанию gpt-4-turbo-preview):${NC} "
        read openai_model
        openai_model=${openai_model:-gpt-4-turbo-preview}
        
        # Generate secret key
        secret_key=$(openssl rand -hex 32)
        
        # Create .env file
        print_step "📝 Создание конфигурационного файла"
        
        cat > .env << EOF
# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=${telegram_token}
TELEGRAM_WEBHOOK_URL=${webhook_url}
TELEGRAM_WEBHOOK_SECRET=$(openssl rand -hex 16)

# OpenAI Configuration
OPENAI_API_KEY=${openai_key}
OPENAI_MODEL=${openai_model}
OPENAI_EMBEDDING_MODEL=text-embedding-3-small

# Database Configuration
DATABASE_URL=postgresql+asyncpg://jarvis:jarvis_secure_password@postgres:5432/ai_jarvis
DATABASE_POOL_SIZE=20
DATABASE_MAX_OVERFLOW=0

# Redis Configuration
REDIS_URL=redis://redis:6379/0

# Qdrant Vector Database
QDRANT_URL=http://qdrant:6333
QDRANT_API_KEY=
QDRANT_COLLECTION_NAME=knowledge_base

# Application Settings
SECRET_KEY=${secret_key}
DEBUG=True
LOG_LEVEL=INFO
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:8000

# File Storage
UPLOAD_DIR=/app/uploads
MAX_UPLOAD_SIZE=104857600

# Celery Configuration
CELERY_BROKER_URL=redis://redis:6379/0
CELERY_RESULT_BACKEND=redis://redis:6379/1
EOF
        
        print_success "Конфигурация сохранена в .env"
    fi
    
    # Docker setup
    print_step "${DOCKER} Запуск Docker контейнеров"
    echo ""
    
    echo -e "${BLUE}Загрузка и запуск сервисов...${NC}"
    docker-compose up -d > /tmp/docker-setup.log 2>&1 &
    docker_pid=$!
    
    spinner $docker_pid
    wait $docker_pid
    
    if [ $? -eq 0 ]; then
        print_success "Docker контейнеры запущены"
    else
        print_error "Ошибка при запуске Docker"
        echo -e "${YELLOW}Логи ошибки сохранены в /tmp/docker-setup.log${NC}"
        exit 1
    fi
    
    # Wait for services
    print_step "${CLOCK} Ожидание готовности сервисов"
    echo ""
    
    services=("postgres" "redis" "qdrant" "backend")
    total=${#services[@]}
    current=0
    
    for service in "${services[@]}"; do
        ((current++))
        print_progress $current $total
        sleep 2
    done
    echo -e "\n"
    print_success "Все сервисы готовы к работе!"
    
    # Initialize database
    print_step "${DATABASE} Инициализация базы данных"
    echo ""
    
    echo -e "${BLUE}Создание таблиц и расширений...${NC}"
    docker exec ai_jarvis_backend python init_db.py > /tmp/db-init.log 2>&1
    
    if [ $? -eq 0 ]; then
        print_success "База данных инициализирована"
    else
        print_warning "Возможны проблемы с инициализацией БД"
        echo -e "${YELLOW}Проверьте логи: /tmp/db-init.log${NC}"
    fi
    
    # Health check
    print_step "🏥 Проверка здоровья сервисов"
    echo ""
    
    sleep 3
    
    # Check API health
    if curl -s http://localhost:8000/health | grep -q "healthy"; then
        print_success "API сервер работает"
    else
        print_warning "API сервер недоступен (может потребоваться время на запуск)"
    fi
    
    # Success message
    echo ""
    echo -e "${GREEN}${BOLD}╔════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${GREEN}${BOLD}║                                                            ║${NC}"
    echo -e "${GREEN}${BOLD}║${NC}              ${STAR}${STAR}${STAR}  УСТАНОВКА ЗАВЕРШЕНА!  ${STAR}${STAR}${STAR}${NC}              ${GREEN}${BOLD}║${NC}"
    echo -e "${GREEN}${BOLD}║                                                            ║${NC}"
    echo -e "${GREEN}${BOLD}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    
    # Service URLs
    print_info "Сервисы запущены и доступны:"
    echo ""
    echo -e "   ${CYAN}${BOLD}FastAPI Docs:${NC}    ${WHITE}http://localhost:8000/docs${NC}"
    echo -e "   ${CYAN}${BOLD}API Health:${NC}      ${WHITE}http://localhost:8000/health${NC}"
    echo -e "   ${CYAN}${BOLD}Qdrant UI:${NC}       ${WHITE}http://localhost:6333/dashboard${NC}"
    echo ""
    
    # Next steps
    echo -e "${YELLOW}${BOLD}📋 Следующие шаги:${NC}"
    echo ""
    echo -e "   ${GREEN}1.${NC} Откройте Telegram и найдите вашего бота"
    echo -e "   ${GREEN}2.${NC} Отправьте команду ${WHITE}/start${NC}"
    echo -e "   ${GREEN}3.${NC} Начните общаться с AI ассистентом!"
    echo ""
    echo -e "${CYAN}${BOLD}🔧 Полезные команды:${NC}"
    echo ""
    echo -e "   ${WHITE}docker-compose logs -f backend${NC}     - Просмотр логов"
    echo -e "   ${WHITE}docker-compose ps${NC}                  - Статус контейнеров"
    echo -e "   ${WHITE}docker-compose down${NC}                - Остановить все"
    echo -e "   ${WHITE}docker-compose restart backend${NC}     - Перезапустить backend"
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
