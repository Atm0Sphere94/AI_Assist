#!/bin/bash

# =============================================================================
# AI Jarvis - Установка Docker
# =============================================================================
# Шаг 2: Устанавливает Docker и Docker Compose
# =============================================================================

set -e

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

log_step "Шаг 2: Установка Docker"

# Проверка установлен ли Docker
if command -v docker &> /dev/null; then
    log_success "Docker уже установлен"
    docker --version
    
    # Проверка Docker Compose
    if docker compose version &> /dev/null 2>&1; then
        docker compose version
    else
        log_error "Docker Compose плагин не найден"
        exit 1
    fi
    
    # Добавляем пользователя в группу docker
    ORIGINAL_USER=${SUDO_USER:-$(whoami)}
    if [ "$ORIGINAL_USER" != "root" ] && id "$ORIGINAL_USER" &> /dev/null; then
        if groups "$ORIGINAL_USER" | grep &> /dev/null '\bdocker\b'; then
            log_success "Пользователь '$ORIGINAL_USER' уже в группе docker"
        else
            log_info "Добавляем пользователя '$ORIGINAL_USER' в группу docker..."
            usermod -aG docker "$ORIGINAL_USER"
        fi
    fi
    
    log_success "Docker готов к работе"
    echo ""
    exit 0
fi

# Установка зависимостей
log_info "Устанавливаем зависимости..."
apt-get update -qq
apt-get install -y -qq \
    ca-certificates \
    curl \
    gnupg \
    lsb-release

# Добавление GPG ключа Docker
log_info "Добавляем GPG ключ Docker..."
install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg 2>/dev/null | gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null
chmod a+r /etc/apt/keyrings/docker.gpg

# Добавление репозитория Docker
log_info "Добавляем репозиторий Docker..."
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  tee /etc/apt/sources.list.d/docker.list > /dev/null

# Установка Docker
log_info "Устанавливаем Docker Engine и Compose..."
apt-get update -qq
apt-get install -y -qq \
    docker-ce \
    docker-ce-cli \
    containerd.io \
    docker-buildx-plugin \
    docker-compose-plugin

# Добавление пользователя в группу docker
ORIGINAL_USER=${SUDO_USER:-$(whoami)}
if [ "$ORIGINAL_USER" != "root" ] && id "$ORIGINAL_USER" &> /dev/null; then
    log_info "Добавляем пользователя '$ORIGINAL_USER' в группу docker..."
    usermod -aG docker "$ORIGINAL_USER"
fi

# Проверка установки
log_success "Проверяем установку..."
docker --version
docker compose version

log_success "Docker успешно установлен!"
echo ""
