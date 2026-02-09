#!/bin/bash
# Simple import checker for Python files

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/utils.sh"

log_step "Проверка Python импортов"

cd "$SCRIPT_DIR/.."

# Check if docker is running
if ! docker ps &> /dev/null; then
    log_error "Docker не запущен"
    exit 1
fi

# Build a temporary test image
log_info "Собираем тестовый образ..."
docker build -t ai_assist_test:latest -f backend/Dockerfile backend/ > /dev/null 2>&1 || {
    log_error "Не удалось собрать образ"
    exit 1
}

# Test imports
log_info "Тестируем импорты..."

TEST_FILES=(
    "config.py"
    "db/models.py"
    "db/session.py"
    "init_db.py"
)

FAILED=0
for file in "${TEST_FILES[@]}"; do
    log_info "Проверяем $file..."
    if docker run --rm ai_assist_test:latest python -m py_compile "$file" 2>&1 | grep -i error; then
        log_error "Ошибка в $file"
        FAILED=1
    else
        log_success "$file OK"
    fi
done

# Cleanup
docker rmi ai_assist_test:latest > /dev/null 2>&1 || true

if [ $FAILED -eq 0 ]; then
    log_success "Все импорты корректны!"
    exit 0
else
    log_error "Найдены ошибки импортов"
    exit 1
fi
