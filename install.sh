#!/bin/bash

# =============================================================================
# AI Jarvis - Quick Install (No Make Required)
# =============================================================================
# Direct installation script that doesn't require make
# Usage: sudo bash install.sh
# =============================================================================

set -e

echo ""
echo "🚀 AI Jarvis - Installation"
echo "============================"
echo ""

# Check if running as root
if [[ "$EUID" -ne 0 ]]; then
    echo "❌ This script must be run as root or with sudo"
    echo "   Please run: sudo bash install.sh"
    exit 1
fi

# Change to script directory
cd "$(dirname "$0")"

# Check if scripts directory exists
if [ -d "scripts" ]; then
    # Use modular installation
    echo "ℹ️  Using modular installation system"
    chmod +x scripts/*.sh
    bash ./scripts/install.sh
else
    # Fallback to legacy setup.sh
    echo "ℹ️  Using legacy setup script"
    if [ -f "setup.sh" ]; then
        chmod +x setup.sh
        ./setup.sh
    else
        echo "❌ Neither scripts/install.sh nor setup.sh found"
        exit 1
    fi
fi
