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
    if command -v systemctl &> /dev/null; then
        if ! systemctl is-active --quiet docker; then
            log_info "Starting Docker service..."
            systemctl start docker
            systemctl enable docker
        fi
    fi
else
    # Install Docker
    install_docker
    
    # Reload systemd daemon and start Docker
    if command -v systemctl &> /dev/null; then
        log_info "Reloading systemd daemon..."
        systemctl daemon-reload
        
        log_info "Starting Docker service..."
        systemctl enable docker
        systemctl start docker
        
        # Wait for Docker to be ready
        sleep 3
        
        # Verify Docker is running
        if systemctl is-active --quiet docker; then
            log_success "Docker service is running"
        else
            log_warning "Docker service status unclear, checking manually..."
            if docker ps &> /dev/null; then
                log_success "Docker is working"
            else
                log_error "Docker is not responding"
                log_info "Trying to start Docker manually..."
                dockerd &
                sleep 3
            fi
        fi
    else
        # No systemd, try starting dockerd directly
        log_info "No systemd detected, starting dockerd..."
        dockerd &
        sleep 3
    fi
    
    log_success "Docker installation complete"
fi

# Verify installation
if docker --version &> /dev/null; then
    docker_version=$(docker --version)
    log_success "Docker: $docker_version"
else
    log_error "Docker installation failed"
    exit 1
fi

if docker compose version &> /dev/null; then
    compose_version=$(docker compose version)
    log_success "Docker Compose: $compose_version"
else
    log_error "Docker Compose installation failed"
    exit 1
fi

echo ""
