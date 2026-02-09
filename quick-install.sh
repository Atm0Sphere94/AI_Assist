#!/bin/bash

# ===================================
# AI Jarvis - Quick Install (One-Liner)
# ===================================
# curl -fsSL https://raw.githubusercontent.com/Atm0Sphere94/AI_Assist/main/quick-install.sh | bash
# ===================================

set -e

REPO_URL="https://github.com/Atm0Sphere94/AI_Assist.git"
INSTALL_DIR="AI_Assist"

echo ""
echo "🚀 AI Jarvis - Quick Installation"
echo "=================================="
echo ""

# Clone repository
echo "📦 Cloning repository..."
if [ -d "$INSTALL_DIR" ]; then
    echo "⚠️  Directory $INSTALL_DIR already exists!"
    read -p "Remove and reinstall? (y/N) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        rm -rf "$INSTALL_DIR"
    else
        echo "❌ Installation cancelled"
        exit 1
    fi
fi

git clone "$REPO_URL" "$INSTALL_DIR"
cd "$INSTALL_DIR"

echo ""
echo "✅ Repository cloned"
echo ""

# Make scripts executable
chmod +x setup.sh install.sh

# Run installation
echo "🔧 Starting installation..."
echo ""

make install

echo ""
echo "🎉 Installation complete!"
echo ""
echo "Access your AI Jarvis:"
echo "  🌐 Web: http://localhost:3000"
echo "  📚 API Docs: http://localhost:8000/docs"
echo ""
echo "Quick commands:"
echo "  make start    - Start services"
echo "  make stop     - Stop services"
echo "  make logs     - View logs"
echo "  make help     - Show all commands"
echo ""
