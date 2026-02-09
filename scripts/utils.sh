#!/bin/bash

# =============================================================================
# AI Jarvis - Utilities Library
# =============================================================================
# Common functions used across installation and management scripts
# =============================================================================

# Colors for output
export RED='\033[0;31m'
export GREEN='\033[0;32m'
export YELLOW='\033[1;33m'
export BLUE='\033[0;34m'
export CYAN='\033[0;36m'
export MAGENTA='\033[0;35m'
export NC='\033[0m' # No Color

# Symbols
export CHECK="✓"
export CROSS="✗"
export ARROW="→"
export INFO="ℹ"
export WARN="⚠"

# =============================================================================
# Logging Functions
# =============================================================================

log_info() {
    echo -e "${BLUE}${INFO} $1${NC}"
}

log_success() {
    echo -e "${GREEN}${CHECK} $1${NC}"
}

log_error() {
    echo -e "${RED}${CROSS} $1${NC}" >&2
}

log_warning() {
    echo -e "${YELLOW}${WARN} $1${NC}"
}

log_step() {
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}$1${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
}

log_header() {
    clear
    echo ""
    echo -e "${MAGENTA}╔════════════════════════════════════════╗${NC}"
    echo -e "${MAGENTA}║                                        ║${NC}"
    echo -e "${MAGENTA}║       🤖 AI Jarvis Installer          ║${NC}"
    echo -e "${MAGENTA}║                                        ║${NC}"
    echo -e "${MAGENTA}╚════════════════════════════════════════╝${NC}"
    echo ""
}

# =============================================================================
# System Check Functions
# =============================================================================

check_root() {
    if [[ "$EUID" -ne 0 ]]; then
        log_error "Этот скрипт должен быть запущен от root или с sudo"
        return 1
    fi
    return 0
}

check_os() {
    if [[ ! -f /etc/os-release ]]; then
        log_error "Не удалось определить ОС. /etc/os-release не найден"
        return 1
    fi
    
    source /etc/os-release
    
    case "$ID" in
        ubuntu|debian)
            log_success "Обнаружено: $PRETTY_NAME"
            export PKG_MANAGER="apt"
            return 0
            ;;
        centos|rhel|rocky|almalinux)
            log_success "Обнаружено: $PRETTY_NAME"
            export PKG_MANAGER="yum"
            return 0
            ;;
        *)
            log_warning "Неподдерживаемая ОС: $PRETTY_NAME"
            log_info "Установка может работать, но не тестировалась"
            read -p "Продолжить? (y/N) " -n 1 -r
            echo
            if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                return 1
            fi
            return 0
            ;;
    esac
}

check_system_resources() {
    local min_ram_gb=2
    local min_disk_gb=10
    
    # Check RAM
    local total_ram_kb=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    local total_ram_gb=$((total_ram_kb / 1024 / 1024))
    
    if [ $total_ram_gb -lt $min_ram_gb ]; then
        log_warning "Мало RAM: ${total_ram_gb}GB (рекомендуется: ${min_ram_gb}GB+)"
    else
        log_success "RAM: ${total_ram_gb}GB"
    fi
    
    # Check disk space
    local free_disk_gb=$(df -BG / | awk 'NR==2 {print $4}' | sed 's/G//')
    
    if [ $free_disk_gb -lt $min_disk_gb ]; then
        log_warning "Мало места на диске: ${free_disk_gb}GB (рекомендуется: ${min_disk_gb}GB+)"
    else
        log_success "Свободно на диске: ${free_disk_gb}GB"
    fi
}

check_network() {
    if ping -c 1 8.8.8.8 &> /dev/null; then
        log_success "Подключение к интернету: OK"
        return 0
    else
        log_error "Нет подключения к интернету"
        return 1
    fi
}

# =============================================================================
# Docker Functions
# =============================================================================

check_docker() {
    if command -v docker &> /dev/null; then
        local docker_version=$(docker --version | awk '{print $3}' | sed 's/,//')
        log_success "Docker установлен: $docker_version"
        return 0
    else
        log_info "Docker не установлен"
        return 1
    fi
}

check_docker_compose() {
    if command -v docker-compose &> /dev/null || docker compose version &> /dev/null 2>&1; then
        log_success "Docker Compose установлен"
        return 0
    else
        log_info "Docker Compose не установлен"
        return 1
    fi
}

install_docker() {
    log_info "Устанавливаем Docker..."
    
    if [ "$PKG_MANAGER" == "apt" ]; then
        # Remove old versions
        apt-get remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
        
        # Install prerequisites
        apt-get update -qq
        apt-get install -y -qq ca-certificates curl gnupg lsb-release
        
        # Add Docker GPG key
        install -m 0755 -d /etc/apt/keyrings
        curl -fsSL https://download.docker.com/linux/ubuntu/gpg 2>/dev/null | gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null
        chmod a+r /etc/apt/keyrings/docker.gpg
        
        # Add repository
        echo \
          "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
          $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
        
        # Install Docker
        apt-get update -qq
        apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
        
    elif [ "$PKG_MANAGER" == "yum" ]; then
        yum install -y -q yum-utils
        yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
        yum install -y -q docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    fi
    
    log_success "Docker успешно установлен"
}

# =============================================================================
# Password Generation
# =============================================================================

generate_password() {
    local length=${1:-32}
    openssl rand -base64 $length | tr -d "=+/" | cut -c1-$length
}

generate_hex() {
    local length=${1:-32}
    openssl rand -hex $length
}

# =============================================================================
# File Operations
# =============================================================================

create_directory() {
    local dir=$1
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        log_success "Created directory: $dir"
    fi
}

backup_file() {
    local file=$1
    if [ -f "$file" ]; then
        local backup="${file}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$file" "$backup"
        log_info "Backed up $file to $backup"
    fi
}

# =============================================================================
# Service Management
# =============================================================================

wait_for_service() {
    local service=$1
    local timeout=${2:-60}
    local counter=0
    
    log_info "Waiting for $service to be ready..."
    
    while ! docker compose ps | grep -q "$service.*running"; do
        sleep 1
        counter=$((counter + 1))
        if [ $counter -ge $timeout ]; then
            log_error "Timeout waiting for $service"
            return 1
        fi
    done
    
    log_success "$service is ready"
    return 0
}

check_service_health() {
    local service=$1
    local health=$(docker compose ps --format json | jq -r ".[] | select(.Name | contains(\"$service\")) | .Health")
    
    if [ "$health" == "healthy" ] || [ "$health" == "" ]; then
        return 0
    else
        return 1
    fi
}

# =============================================================================
# User Input Functions
# =============================================================================

prompt_yes_no() {
    local question=$1
    local default=${2:-n}
    
    if [ "$default" == "y" ]; then
        read -p "$question (Y/n): " -n 1 -r
    else
        read -p "$question (y/N): " -n 1 -r
    fi
    echo
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        return 0
    else
        return 1
    fi
}

prompt_input() {
    local prompt=$1
    local default=$2
    local var_name=$3
    
    if [ -n "$default" ]; then
        read -p "$prompt [$default]: " input
        eval "$var_name=\${input:-$default}"
    else
        read -p "$prompt: " input
        eval "$var_name=\$input"
    fi
}

prompt_secure_input() {
    local prompt=$1
    local var_name=$2
    
    read -sp "$prompt: " input
    echo
    eval "$var_name=\$input"
}

# =============================================================================
# Validation Functions
# =============================================================================

validate_email() {
    local email=$1
    if [[ "$email" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
        return 0
    else
        return 1
    fi
}

validate_domain() {
    local domain=$1
    if [[ "$domain" =~ ^[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(\.[a-zA-Z0-9]([a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$ ]]; then
        return 0
    else
        return 1
    fi
}

validate_ip() {
    local ip=$1
    if [[ "$ip" =~ ^([0-9]{1,3}\.){3}[0-9]{1,3}$ ]]; then
        return 0
    else
        return 1
    fi
}

# =============================================================================
# Export all functions
# =============================================================================

export -f log_info log_success log_error log_warning log_step log_header
export -f check_root check_os check_system_resources check_network
export -f check_docker check_docker_compose install_docker
export -f generate_password generate_hex
export -f create_directory backup_file
export -f wait_for_service check_service_health
export -f prompt_yes_no prompt_input prompt_secure_input
export -f validate_email validate_domain validate_ip
