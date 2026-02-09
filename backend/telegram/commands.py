"""Telegram bot commands definition."""
from aiogram.types import BotCommand

async def set_bot_commands(bot):
    """Set standard bot commands."""
    commands = [
        BotCommand(command="start", description="🔄 Перезапуск / Старт"),
        BotCommand(command="menu", description="📱 Главное меню"),
        BotCommand(command="help", description="ℹ️ Справка"),
    ]
    await bot.set_my_commands(commands)
