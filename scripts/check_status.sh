#!/bin/bash
# Check AI Jarvis service status

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

cd "$SCRIPT_DIR/.."

log_step "Проверка статуса AI Jarvis"

# Check if services are running
log_header "Статус контейнеров"
docker compose ps

echo ""
log_header "Проверка здоровья сервисов"

# Check each service
SERVICES=("postgres" "redis" "qdrant" "backend" "frontend" "celery" "beat")

for service in "${SERVICES[@]}"; do
    container_name="ai_jarvis_${service}"
    if docker ps --format '{{.Names}}' | grep -q "^${container_name}$"; then
        status=$(docker inspect -f '{{.State.Health.Status}}' "$container_name" 2>/dev/null || echo "no-healthcheck")
        if [ "$status" = "healthy" ] || [ "$status" = "no-healthcheck" ]; then
            log_success "$service: running"
        else
            log_warning "$service: $status"
        fi
    else
        log_error "$service: not running"
    fi
done

echo ""
log_header "Последние логи backend"
docker compose logs --tail=20 backend

echo ""
log_header "Последние логи frontend"
docker compose logs --tail=20 frontend

echo ""
log_info "Для просмотра всех логов: docker compose logs -f"
log_info "Для перезапуска: docker compose restart"
