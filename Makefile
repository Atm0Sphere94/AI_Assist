# ===================================
# AI Jarvis - Makefile
# ===================================
# Quick commands for managing AI Jarvis
#
# Usage:
#   make install  - Full installation
#   make start    - Start services
#   make stop     - Stop services
#   make restart  - Restart services
#   make logs     - View logs
#   make clean    - Clean up everything
# ===================================

.PHONY: install start stop restart logs clean status admin-create help

# Default target
.DEFAULT_GOAL := help

# Colors
GREEN  := \033[0;32m
BLUE   := \033[0;34m
YELLOW := \033[1;33m
NC     := \033[0m # No Color

##@ Installation

install: ## 🚀 Full installation (setup + start)
	@echo "$(BLUE)Starting AI Jarvis installation...$(NC)"
	@chmod +x setup.sh
	@./setup.sh
	@echo "$(GREEN)✅ Installation complete!$(NC)"

##@ Services

start: ## ▶️  Start all services
	@echo "$(BLUE)Starting services...$(NC)"
	@docker-compose up -d
	@echo "$(GREEN)✅ Services started$(NC)"
	@echo ""
	@echo "Access points:"
	@echo "  Web: http://localhost:3000"
	@echo "  API: http://localhost:8000/docs"

stop: ## ⏹️  Stop all services
	@echo "$(YELLOW)Stopping services...$(NC)"
	@docker-compose down
	@echo "$(GREEN)✅ Services stopped$(NC)"

restart: ## 🔄 Restart all services
	@echo "$(BLUE)Restarting services...$(NC)"
	@docker-compose restart
	@echo "$(GREEN)✅ Services restarted$(NC)"

status: ## 📊 Show services status
	@docker-compose ps

##@ Logs & Debugging

logs: ## 📜 View all logs (follow mode)
	@docker-compose logs -f

logs-backend: ## 📜 View backend logs only
	@docker-compose logs -f backend

logs-frontend: ## 📜 View frontend logs only
	@docker-compose logs -f frontend

##@ Database

db-init: ## 🗄️  Initialize database
	@echo "$(BLUE)Initializing database...$(NC)"
	@docker-compose exec backend python init_db.py
	@echo "$(GREEN)✅ Database initialized$(NC)"

db-shell: ## 💻 Open database shell
	@docker-compose exec postgres psql -U jarvis -d jarvis_db

##@ Admin Management

admin-create: ## 👤 Create admin user (interactive)
	@echo "$(BLUE)Creating admin user...$(NC)"
	@read -p "Enter admin username: " username; \
	read -sp "Enter admin password: " password; echo ""; \
	docker-compose exec backend python create_admin_user.py "$$username" "$$password"

##@ Maintenance

update: ## 🔄 Update from git and rebuild
	@echo "$(BLUE)Updating from git...$(NC)"
	@git pull
	@echo "$(BLUE)Rebuilding containers...$(NC)"
	@docker-compose up -d --build
	@echo "$(GREEN)✅ Update complete$(NC)"

clean: ## 🧹 Remove all containers, volumes, and data
	@echo "$(YELLOW)⚠️  This will remove all data!$(NC)"
	@read -p "Are you sure? (y/N) " -n 1 -r; echo ""; \
	if [[ $$REPLY =~ ^[Yy]$$ ]]; then \
		docker-compose down -v; \
		rm -rf data/; \
		echo "$(GREEN)✅ Cleanup complete$(NC)"; \
	else \
		echo "Cancelled"; \
	fi

##@ Frontend

frontend-install: ## 📦 Install frontend dependencies
	@echo "$(BLUE)Installing frontend dependencies...$(NC)"
	@cd frontend && npm install
	@echo "$(GREEN)✅ Frontend dependencies installed$(NC)"

frontend-dev: ## 🔧 Start frontend in dev mode
	@echo "$(BLUE)Starting frontend dev server...$(NC)"
	@cd frontend && npm run dev

frontend-build: ## 🏗️  Build frontend for production
	@echo "$(BLUE)Building frontend...$(NC)"
	@cd frontend && npm run build
	@echo "$(GREEN)✅ Frontend built$(NC)"

##@ Testing

test: ## 🧪 Run all tests
	@echo "$(BLUE)Running tests...$(NC)"
	@docker-compose exec backend pytest
	@echo "$(GREEN)✅ Tests complete$(NC)"

##@ Help

help: ## 💡 Show this help message
	@echo ""
	@echo "$(GREEN)🤖 AI Jarvis - Available Commands$(NC)"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf ""} /^[a-zA-Z_-]+:.*?##/ { printf "  $(BLUE)%-18s$(NC) %s\n", $$1, $$2 } /^##@/ { printf "\n$(YELLOW)%s$(NC)\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
	@echo ""
	@echo "$(YELLOW)Quick Start:$(NC)"
	@echo "  1. Run: $(GREEN)make install$(NC)"
	@echo "  2. Access web at $(BLUE)http://localhost:3000$(NC)"
	@echo ""
