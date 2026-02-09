#!/bin/bash

# =============================================================================
# AI Jarvis - Подготовка системы
# =============================================================================
# Шаг 1: Проверка системных требований и подготовка окружения
# =============================================================================

set -e

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

log_header
log_step "Шаг 1: Подготовка системы"

# Проверка запуска от root
if ! check_root; then
    exit 1
fi

# Определение ОС
log_info "Определяем операционную систему..."
if ! check_os; then
    exit 1
fi

# Проверка ресурсов системы
log_info "Проверяем системные ресурсы..."
check_system_resources

# Проверка сетевого подключения
log_info "Проверяем подключение к интернету..."
if ! check_network; then
    exit 1
fi

# Обновление системных пакетов
log_info "Обновляем системные пакеты..."
if [ "$PKG_MANAGER" == "apt" ]; then
    apt-get update -qq
    apt-get upgrade -y -qq
    apt-get install -y -qq \
        curl \
        wget \
        git \
        ca-certificates \
        gnupg \
        lsb-release \
        openssl \
        jq \
        make
elif [ "$PKG_MANAGER" == "yum" ]; then
    yum update -y -q
    yum install -y -q \
        curl \
        wget \
        git \
        ca-certificates \
        openssl \
        jq \
        make
fi

log_success "Подготовка системы завершена"
echo ""
