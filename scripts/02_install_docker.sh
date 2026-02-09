#!/bin/bash

# =============================================================================
# AI Jarvis - Docker Installation
# =============================================================================
# Step 2: Installs Docker and Docker Compose if not already installed
# =============================================================================

set -e

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

log_step "Step 2: Docker Installation"

# Check if Docker is installed
if check_docker && check_docker_compose; then
    log_success "Docker and Docker Compose are already installed"
    
    # Start Docker if not running
    if ! systemctl is-active --quiet docker; then
        log_info "Starting Docker service..."
        systemctl start docker
        systemctl enable docker
    fi
else
    # Install Docker
    install_docker
    
    # Start Docker
    systemctl start docker
    systemctl enable docker
    
    log_success "Docker installation complete"
fi

# Verify installation
if docker --version &> /dev/null; then
    local docker_version=$(docker --version)
    log_success "Docker: $docker_version"
else
    log_error "Docker installation failed"
    exit 1
fi

if docker compose version &> /dev/null; then
    local compose_version=$(docker compose version)
    log_success "Docker Compose: $compose_version"
else
    log_error "Docker Compose installation failed"
    exit 1
fi

echo ""
