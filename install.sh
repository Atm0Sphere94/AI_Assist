#!/bin/bash

# =============================================================================
# AI Jarvis - Quick Install
# =============================================================================
# Automatically installs make if needed, then runs modular installation
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

# Install make if not present
if ! command -v make &> /dev/null; then
    echo "📦 Installing make..."
    
    # Detect OS and install make
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        case "$ID" in
            ubuntu|debian)
                apt-get update -qq
                apt-get install -y -qq make
                ;;
            centos|rhel|rocky|almalinux)
                yum install -y -q make
                ;;
            *)
                echo "❌ Unsupported OS. Please install 'make' manually and try again."
                exit 1
                ;;
        esac
    fi
    
    echo "✅ Make installed"
fi

# Now run installation via make
echo ""
echo "🚀 Starting installation via make..."
echo ""

make install

