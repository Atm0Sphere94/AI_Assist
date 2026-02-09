#!/bin/bash

# =============================================================================
# AI Jarvis - Final Report
# =============================================================================
# Step 6: Shows installation summary and next steps
# =============================================================================

set -e

# Source utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

cd "$(dirname "$SCRIPT_DIR")"

# Load configuration
if [ -f ".env" ]; then
    source .env
fi

log_step "Installation Complete!"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                        ║${NC}"
echo -e "${GREEN}║  ✨  AI Jarvis Successfully Installed  ║${NC}"
echo -e "${GREEN}║                                        ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════╝${NC}"
echo ""

# Show access points
echo -e "${CYAN}Access Points:${NC}"
if [ "$PRODUCTION" == "true" ]; then
    echo -e "  🌐 Web:      ${BLUE}https://$DOMAIN${NC}"
    echo -e "  📡 API:      ${BLUE}https://api.$DOMAIN${NC}"
    echo -e "  📊 Qdrant:   ${BLUE}https://qdrant.$DOMAIN${NC}"
else
    echo -e "  🌐 Web:      ${BLUE}http://localhost:3000${NC}"
    echo -e "  📡 API:      ${BLUE}http://localhost:8000${NC}"
    echo -e "  📊 Qdrant:   ${BLUE}http://localhost:6333${NC}"
fi
echo ""

# Show credentials
echo -e "${CYAN}Admin Login:${NC}"
echo -e "  Username: ${YELLOW}$ADMIN_USERNAME${NC}"
echo -e "  Password: ${YELLOW}********${NC}"
echo ""

# Show quick commands
echo -e "${CYAN}Quick Commands:${NC}"
echo -e "  ${GREEN}make start${NC}    - Start all services"
echo -e "  ${GREEN}make stop${NC}     - Stop all services"
echo -e "  ${GREEN}make logs${NC}     - View logs"
echo -e "  ${GREEN}make status${NC}   - Check service status"
echo -e "  ${GREEN}make help${NC}     - Show all commands"
echo ""

# DNS instructions for production
if [ "$PRODUCTION" == "true" ]; then
    echo -e "${YELLOW}⚠️  DNS Configuration Required:${NC}"
    echo -e "  Add these DNS records pointing to your server IP:"
    echo -e "    A    @         -> YOUR_SERVER_IP"
    echo -e "    A    www       -> YOUR_SERVER_IP"
    echo -e "    A    api       -> YOUR_SERVER_IP"
    echo -e "    A    qdrant    -> YOUR_SERVER_IP"
    echo ""
    echo -e "  SSL certificates will be issued automatically after DNS propagation"
    echo ""
fi

# Show service status
echo -e "${CYAN}Service Status:${NC}"
docker compose ps
echo ""

log_success "Installation complete! Enjoy your AI Jarvis! 🎉"
echo ""
