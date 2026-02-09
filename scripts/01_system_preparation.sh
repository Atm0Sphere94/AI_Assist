#!/bin/bash

# =============================================================================
# AI Jarvis - System Preparation
# =============================================================================
# Step 1: Checks system requirements and prepares the environment
# =============================================================================

set -e

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

log_header
log_step "Step 1: System Preparation"

# Check if running as root
if ! check_root; then
    exit 1
fi

# Detect OS
log_info "Detecting operating system..."
if ! check_os; then
    exit 1
fi

# Check system resources
log_info "Checking system resources..."
check_system_resources

# Check network connectivity
log_info "Checking network connectivity..."
if ! check_network; then
    exit 1
fi

# Update system packages
log_info "Updating system packages..."
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

log_success "System preparation complete"
echo ""
