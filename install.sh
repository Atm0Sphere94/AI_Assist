#!/bin/bash

# ==================================
# AI Jarvis - One-Command Installer
# ==================================
# Usage: ./install.sh
# ==================================

set -e

echo ""
echo "🚀 AI Jarvis - Quick Install"
echo "================================"
echo ""

# Make setup.sh executable
chmod +x setup.sh

# Run setup
./setup.sh

echo ""
echo "✅ Installation complete!"
echo ""
echo "Next commands:"
echo "  make start    - Start all services"
echo "  make stop     - Stop all services"
echo "  make logs     - View logs"
echo "  make restart  - Restart services"
echo ""
