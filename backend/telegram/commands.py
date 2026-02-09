"""Telegram bot commands definition."""
from aiogram.types import BotCommand

async def set_bot_commands(bot):
    """Set standard bot commands."""
    commands = [
        BotCommand(command="start", description="🏠 Запустить бота / Главное меню"),
        BotCommand(command="menu", description="📱 Показать клавиатуру"),
        BotCommand(command="help", description="ℹ️ Справка и возможности"),
        BotCommand(command="new_task", description="📝 Новая задача"),
        BotCommand(command="calendar", description="📅 Календарь"),
        BotCommand(command="remind", description="⏰ Создать напоминание"),
        BotCommand(command="cancel", description="❌ Отмена текущего действия"),
    ]
    await bot.set_my_commands(commands)
