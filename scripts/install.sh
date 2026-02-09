#!/bin/bash

# =============================================================================
# AI Jarvis - Master Installer
# =============================================================================
# Orchestrates the entire installation process
# =============================================================================

set -e

# Get script directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Source utilities
source "$SCRIPT_DIR/utils.sh"

# Show header
log_header

# Check if running as root
if ! check_root; then
    log_error "This script must be run as root or with sudo"
    exit 1
fi

# Required scripts
REQUIRED_SCRIPTS=(
    "01_system_preparation.sh"
    "02_install_docker.sh"
    "03_configuration_wizard.sh"
    "04_deploy_services.sh"
    "05_initialize_database.sh"
    "06_final_report.sh"
)

# Check all scripts exist
log_info "Checking installation scripts..."
for script in "${REQUIRED_SCRIPTS[@]}"; do
    if [ ! -f "$SCRIPT_DIR/$script" ]; then
        log_error "Missing script: $script"
        exit 1
    fi
    # Make executable
    chmod +x "$SCRIPT_DIR/$script"
done
log_success "All scripts found"
echo ""

# Check if already installed
if [ -f ".env" ] && docker ps &> /dev/null 2>&1; then
    log_warning "Обнаружена существующая установка AI Jarvis"
    if prompt_yes_no "Остановить и очистить перед переустановкой?" "y"; then
        log_info "Останавливаем сервисы..."
        docker compose down -v 2>/dev/null || true
        
        log_info "Очищаем Docker образы проекта..."
        docker rmi -f $(docker images -q 'ai_assist-*' 2>/dev/null) 2>/dev/null || true
        
        log_info "Очищаем неиспользуемые Docker образы..."
        docker image prune -af 2>/dev/null || true
        
        log_info "Очищаем build cache..."
        docker builder prune -af 2>/dev/null || true
        
        log_info "Очищаем volumes..."
        docker volume prune -f 2>/dev/null || true
        
        log_info "Очищаем networks..."
        docker network prune -f 2>/dev/null || true
        
        # Показываем освобождённое место
        log_success "Очистка завершена"
        log_info "Проверяем место на диске..."
        df -h / | grep -v Filesystem
    else
        log_info "Продолжаем установку без очистки"
    fi
    echo ""
fi

# Run installation steps
export DEBIAN_FRONTEND=noninteractive

# Step 1: System Preparation
bash "$SCRIPT_DIR/01_system_preparation.sh"

# Step 2: Docker Installation
bash "$SCRIPT_DIR/02_install_docker.sh"

# Step 3: Configuration Wizard
bash "$SCRIPT_DIR/03_configuration_wizard.sh"

# Install frontend dependencies
cd "$SCRIPT_DIR/.."
if [ -d "frontend" ]; then
    log_step "Installing Frontend Dependencies"
    cd frontend
    npm install --silent
    cd ..
    log_success "Frontend dependencies installed"
    echo ""
fi

# Step 4: Deploy Services
bash "$SCRIPT_DIR/04_deploy_services.sh"

# Step 5: Initialize Database
bash "$SCRIPT_DIR/05_initialize_database.sh"

# Step 6: Final Report
bash "$SCRIPT_DIR/06_final_report.sh"
