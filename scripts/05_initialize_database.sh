#!/bin/bash

# =============================================================================
# AI Jarvis - Database Initialization
# =============================================================================
# Step 5: Initializes database and creates admin user
# =============================================================================

set -e

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

log_step "Step 5: Database Initialization"

cd "$(dirname "$SCRIPT_DIR")"

# Load configuration
if [ -f ".env" ]; then
    source .env
fi

# Initialize database
log_info "Initializing database schema..."
docker compose exec -T backend python init_db.py

log_success "Database initialized"

# Create admin user
if [ -n "$ADMIN_USERNAME" ] && [ -n "$ADMIN_PASSWORD" ]; then
    log_info "Creating admin user..."
    docker compose exec -T backend python create_admin_user.py "$ADMIN_USERNAME" "$ADMIN_PASSWORD" $ADMIN_TELEGRAM_ID
    
    if [ $? -eq 0 ]; then
        log_success "Admin user created: $ADMIN_USERNAME"
    else
        log_warning "Admin user may already exist"
    fi
fi

echo ""
