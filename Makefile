# ===================================
# AI Jarvis - Makefile
# ===================================
# Management commands for AI Jarvis
# ===================================

.PHONY: help install update start stop restart logs status monitor clean clean-all backup restore doctor admin-create frontend-dev frontend-build

# Colors
GREEN  := \033[0;32m
BLUE   := \033[0;34m
YELLOW := \033[1;33m
CYAN   := \033[0;36m
NC     := \033[0m

# Project name
PROJECT_NAME := ai_jarvis

##@ Installation & Updates

install: ## 🚀 Full installation
	@echo "${BLUE}Starting AI Jarvis installation...${NC}"
	@chmod +x scripts/*.sh
	@sudo bash ./scripts/install.sh
	@echo "${GREEN}✅ Installation complete!${NC}"

update: ## 🔄 Update all services
	@echo "${BLUE}Updating AI Jarvis...${NC}"
	@git pull
	@docker compose pull
	@docker compose up -d --build
	@echo "${GREEN}✅ Update complete${NC}"

##@ Service Management

start: ## ▶️  Start all services
	@echo "${BLUE}Starting services...${NC}"
	@docker compose up -d
	@echo "${GREEN}✅ Services started${NC}"
	@echo ""
	@make status

stop: ## ⏹️  Stop all services
	@echo "${YELLOW}Stopping services...${NC}"
	@docker compose down
	@echo "${GREEN}✅ Services stopped${NC}"

restart: ## 🔄 Restart all services
	@echo "${BLUE}Restarting services...${NC}"
	@docker compose restart
	@echo "${GREEN}✅ Services restarted${NC}"

status: ## 📊 Show service status
	@echo "${CYAN}Service Status:${NC}"
	@docker compose ps

##@ Logs & Monitoring

logs: ## 📜 View all logs (follow mode)
	@docker compose logs -f --tail=100

logs-backend: ## 📜 Backend logs only
	@docker compose logs -f --tail=100 backend

logs-frontend: ## 📜 Frontend logs only
	@docker compose logs -f --tail=100 frontend

logs-celery: ## 📜 Celery worker logs
	@docker compose logs -f --tail=100 celery_worker

monitor: ## 📈 Live resource monitoring
	@docker stats

##@ Database Management

db-init: ## 🗄️  Initialize database
	@echo "${BLUE}Initializing database...${NC}"
	@docker compose exec backend python init_db.py
	@echo "${GREEN}✅ Database initialized${NC}"

db-shell: ## 💻 Open database shell
	@docker compose exec postgres psql -U jarvis -d jarvis_db

db-backup: ## 💾 Backup database
	@echo "${BLUE}Creating database backup...${NC}"
	@mkdir -p backups
	@docker compose exec postgres pg_dump -U jarvis jarvis_db > backups/backup_$(shell date +%Y%m%d_%H%M%S).sql
	@echo "${GREEN}✅ Backup created${NC}"

db-restore: ## 📥 Restore database from backup
	@echo "${YELLOW}Available backups:${NC}"
	@ls -1 backups/*.sql
	@read -p "Enter backup file name: " backup; \
	docker compose exec -T postgres psql -U jarvis jarvis_db < "backups/$$backup"

##@ Admin Management

admin-create: ## 👤 Create admin user
	@echo "${BLUE}Creating admin user...${NC}"
	@read -p "Enter admin username: " username; \
	read -sp "Enter admin password: " password; echo ""; \
	docker compose exec backend python create_admin_user.py "$$username" "$$password"

##@ Frontend Development

frontend-install: ## 📦 Install frontend dependencies
	@echo "${BLUE}Installing frontend dependencies...${NC}"
	@cd frontend && npm install
	@echo "${GREEN}✅ Dependencies installed${NC}"

frontend-dev: ## 🔧 Start frontend dev server
	@echo "${BLUE}Starting frontend dev server...${NC}"
	@cd frontend && npm run dev

frontend-build: ## 🏗️  Build frontend for production
	@echo "${BLUE}Building frontend...${NC}"
	@cd frontend && npm run build
	@echo "${GREEN}✅ Frontend built${NC}"

##@ Maintenance & Diagnostics

clean: ## 🧹 Clean unused Docker resources
	@echo "${YELLOW}Cleaning unused Docker resources...${NC}"
	@docker system prune -f
	@echo "${GREEN}✅ Cleanup complete${NC}"

clean-all: ## 🗑️  Remove ALL Docker resources (DANGEROUS)
	@echo "${RED}⚠️  This will delete ALL containers, images, volumes!${NC}"
	@read -p "Are you sure? Type 'yes' to confirm: " confirm; \
	if [ "$$confirm" = "yes" ]; then \
		docker compose down -v; \
		docker system prune -a --volumes -f; \
		echo "${GREEN}✅ Complete cleanup done${NC}"; \
	else \
		echo "Cancelled"; \
	fi

doctor: ## 🔍 Run system diagnostics
	@echo "${CYAN}AI Jarvis System Diagnostics${NC}"
	@echo ""
	@echo "${BLUE}Docker Version:${NC}"
	@docker --version
	@docker compose version
	@echo ""
	@echo "${BLUE}Service Health:${NC}"
	@docker compose ps
	@echo ""
	@echo "${BLUE}Disk Usage:${NC}"
	@docker system df
	@echo ""
	@echo "${BLUE}Container Resource Usage:${NC}"
	@docker stats --no-stream
	@echo ""
	@echo "${BLUE}Recent Errors (last 20 lines):${NC}"
	@docker compose logs --tail=20 | grep -i error || echo "No recent errors"

show-restarts: ## 🔄 Show container restart counts
	@docker ps -q | while read id; do \
		name=$$(docker inspect --format '{{.Name}}' $$id | sed 's/^\///'); \
		restarts=$$(docker inspect --format '{{.RestartCount}}' $$id); \
		echo "$$name: $$restarts restarts"; \
	done

##@ Help

help: ## 💡 Show this help message
	@echo ""
	@echo "${GREEN}🤖 AI Jarvis - Available Commands${NC}"
	@echo ""
	@awk 'BEGIN {FS = ":.*##"; printf ""} /^[a-zA-Z_-]+:.*?##/ { printf "  ${BLUE}%-20s${NC} %s\n", $$1, $$2 } /^##@/ { printf "\n${YELLOW}%s${NC}\n", substr($$0, 5) } ' $(MAKEFILE_LIST)
	@echo ""
	@echo "${YELLOW}Examples:${NC}"
	@echo "  ${GREEN}make install${NC}           # First time installation"
	@echo "  ${GREEN}make logs${NC}              # View all service logs"
	@echo "  ${GREEN}make logs-backend${NC}      # View only backend logs"
	@echo "  ${GREEN}make db-backup${NC}         # Create database backup"
	@echo "  ${GREEN}make doctor${NC}            # Run full diagnostics"
	@echo ""

