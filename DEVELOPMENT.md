# Development Guide

## Архитектура

### Agentic Workflow

Система использует LangGraph для интеллектуальной маршрутизации сообщений:

1. **Intent Router** - определяет намерение пользователя через LLM
2. **Specialized Agents** - выполняют специфические задачи:
   - Task Agent - управление задачами
   - Calendar Agent - работа с календарём
   - Reminder Agent - напоминания
   - Image Agent - генерация изображений
   - Document Agent - обработка документов
   - RAG Agent - поиск в базе знаний

### Компоненты

```
┌─────────────┐
│  Telegram   │
│    Bot      │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│   FastAPI   │
│   Webhook   │
└──────┬──────┘
       │
       ▼
┌─────────────┐
│  LangGraph  │
│   Router    │
└──────┬──────┘
       │
       ├──► Task Agent ──► Task Service ──► PostgreSQL
       ├──► Calendar Agent ──► Calendar Service ──► PostgreSQL
       ├──► RAG Agent ──► RAG Service ──► Qdrant
       └──► Image Agent ──► OpenAI DALL-E
```

## Добавление нового агента

1. Создайте файл в `backend/agents/your_agent.py`
2. Реализуйте функцию-узел:

```python
async def your_agent_node(state: AgentState) -> AgentState:
    # Ваша логика
    return state
```

3. Добавьте в `workflow.py`:

```python
workflow.add_node("your_agent", your_agent_node)
workflow.add_conditional_edges(
    "intent_router",
    lambda state: state.get("intent"),
    {
        # ...
        "your_intent": "your_agent",
    }
)
```

4. Обновите intent router для распознавания нового намерения

## Работа с базой данных

### Создание миграции

```bash
cd backend
alembic revision --autogenerate -m "Description"
alembic upgrade head
```

### Работа с сессией

```python
from db import get_db, User

async def example(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == 1))
    user = result.scalar_one_or_none()
```

## Тестирование

### Запуск тестов

```bash
cd backend
pytest tests/ -v --cov
```

### Ручное тестирование

1. Запустите проект: `./setup.sh`
2. Отправьте боту: `/start`
3. Попробуйте различные запросы:
   - "Создай задачу: купить молоко"
   - "Напомни мне завтра в 10:00"
   - "Нарисуй кота в космосе"

## Debugging

### Просмотр логов

```bash
# Все сервисы
docker-compose logs -f

# Только backend
docker-compose logs -f backend

# Только celery
docker-compose logs -f celery_worker
```

### Подключение к базе данных

```bash
docker exec -it ai_jarvis_postgres psql -U jarvis -d ai_jarvis
```

### Redis CLI

```bash
docker exec -it ai_jarvis_redis redis-cli
```

## Production Deployment

### Environment Variables

Обязательно измените в production:
- `SECRET_KEY` - генерируйте случайную строку
- `DEBUG=False`
- Используйте сильные пароли для БД
- Настройте HTTPS для webhook

### SSL/HTTPS

Telegram требует HTTPS для webhook. Используйте:
- Let's Encrypt для SSL сертификата
- Nginx как reverse proxy
- Или используйте готовые решения (Caddy, Traefik)

### Масштабирование

- Увеличьте количество Celery workers
- Используйте managed PostgreSQL
- Добавьте Redis Cluster
- Используйте CDN для медиа-файлов

## Полезные команды

```bash
# Пересобрать контейнеры
docker-compose up -d --build

# Остановить все
docker-compose down

# Удалить данные (ОСТОРОЖНО!)
docker-compose down -v

# Войти в контейнер
docker exec -it ai_jarvis_backend bash

# Проверить здоровье
curl http://localhost:8000/health
```
