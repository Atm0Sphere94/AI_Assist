#!/bin/bash

# =============================================================================
# AI Jarvis - Установка Docker
# =============================================================================
# Шаг 2: Устанавливает Docker и Docker Compose если их нет
# =============================================================================

set -e

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

log_step "Шаг 2: Установка Docker"

# Проверка установлен ли Docker
if check_docker && check_docker_compose; then
    log_success "Docker и Docker Compose уже установлены"
    
    # Проверка работает ли Docker
    if docker ps &> /dev/null 2>&1; then
        log_success "Docker работает"
    else
        log_warning "Docker установлен но не запущен, запускаем..."
        # Пробуем запустить через systemd
        if command -v systemctl &> /dev/null; then
            systemctl start docker 2>/dev/null || true
            systemctl enable docker 2>/dev/null || true
            sleep 2
        fi
        
        # Если все равно не работает - запускаем напрямую
        if ! docker ps &> /dev/null 2>&1; then
            log_info "Запускаем dockerd вручную..."
            pkill dockerd 2>/dev/null || true
            nohup dockerd > /var/log/docker.log 2>&1 &
            sleep 5
        fi
    fi
else
    # Установка Docker
    install_docker
    
    log_info "Запускаем Docker..."
    
    # Пробуем через systemd
    if command -v systemctl &> /dev/null; then
        systemctl daemon-reload 2>/dev/null || true
        
        if systemctl enable docker 2>/dev/null && systemctl start docker 2>/dev/null; then
            log_success "Docker запущен через systemd"
            sleep 3
        else
            log_warning "Systemd не может запустить Docker, запускаем вручную"
        fi
    fi
    
    # Проверяем работает ли через systemd
    if ! docker ps &> /dev/null 2>&1; then
        log_info "Запускаем dockerd напрямую..."
        
        # Останавливаем все процессы dockerd
        pkill dockerd 2>/dev/null || true
        sleep 2
        
        # Запускаем dockerd в фоне
        nohup dockerd > /var/log/docker.log 2>&1 &
        
        # Ждём запуска
        log_info "Ожидаем запуска Docker..."
        for i in {1..10}; do
            sleep 1
            if docker ps &> /dev/null 2>&1; then
                log_success "Docker запущен успешно"
                break
            fi
            
            if [ $i -eq 10 ]; then
                log_error "Не удалось запустить Docker"
                log_info "Проверьте логи: /var/log/docker.log"
                tail -n 20 /var/log/docker.log 2>/dev/null || true
                exit 1
            fi
        done
    fi
    
    log_success "Установка Docker завершена"
fi

# Проверка установки
if docker --version &> /dev/null; then
    docker_version=$(docker --version)
    log_success "Docker: $docker_version"
else
    log_error "Установка Docker не удалась"
    exit 1
fi

if docker compose version &> /dev/null 2>&1; then
    compose_version=$(docker compose version)
    log_success "Docker Compose: $compose_version"
else
    log_error "Установка Docker Compose не удалась"
    exit 1
fi

# Финальная проверка что Docker работает
log_info "Проверяем работу Docker..."
if docker ps &> /dev/null 2>&1; then
    log_success "✓ Docker работает корректно"
else
    log_error "✗ Docker не отвечает"
    log_info "Последние 20 строк логов:"
    tail -n 20 /var/log/docker.log 2>/dev/null || echo "Логи недоступны"
    exit 1
fi

echo ""
