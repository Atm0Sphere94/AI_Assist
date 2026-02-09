#!/bin/bash

# =============================================================================
# AI Jarvis - Service Deployment
# =============================================================================
# Step 4: Builds and starts all Docker services
# =============================================================================

set -e

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

log_step "Step 4: Service Deployment"

cd "$(dirname "$SCRIPT_DIR")"

# Determine which compose file to use
if [ -f ".env" ]; then
    source .env
    if [ "$PRODUCTION" == "true" ]; then
        COMPOSE_FILE="docker-compose.production.yml"
        log_info "Using production configuration"
    else
        COMPOSE_FILE="docker-compose.yml"
        log_info "Using development configuration"
    fi
else
    COMPOSE_FILE="docker-compose.yml"
fi

# Build services
log_info "Building Docker images..."
docker compose -f $COMPOSE_FILE build --no-cache

# Start services
log_info "Starting services..."
docker compose -f $COMPOSE_FILE up -d

# Wait for services
log_info "Waiting for services to start..."
sleep 10

log_success "Services deployed successfully"
echo ""
