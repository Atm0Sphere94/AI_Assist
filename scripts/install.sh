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

# Run installation steps
export DEBIAN_FRONTEND=noninteractive

# Step 1: System Preparation
bash "$SCRIPT_DIR/01_system_preparation.sh"

# Step 2: Docker Installation
bash "$SCRIPT_DIR/02_install_docker.sh"

 Step 3: Configuration Wizard
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
