"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { TelegramLogin } from "@/components/telegram-login";
import { Bot, Sparkles, Shield, Cloud } from "lucide-react";

export default function Home() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuthStore();

    useEffect(() => {
        if (isAuthenticated) {
            router.push("/chat");
        }
    }, [isAuthenticated, router]);

    return (
        <main className="min-h-screen flex items-center justify-center p-4">
            <div className="max-w-4xl w-full">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <div className="inline-block p-4 glass rounded-2xl mb-6">
                        <Bot className="w-16 h-16 text-indigo-400" />
                    </div>
                    <h1 className="text-6xl font-bold mb-4">
                        <span className="text-gradient">AI Jarvis</span>
                    </h1>
                    <p className="text-xl text-gray-400 mb-8">
                        Ваш персональный AI ассистент с базой знаний
                    </p>
                </div>

                {/* Features Grid */}
                <div className="grid md:grid-cols-3 gap-6 mb-12">
                    <div className="glass p-6 rounded-xl">
                        <Sparkles className="w-8 h-8 text-purple-400 mb-3" />
                        <h3 className="text-lg font-semibold mb-2">Умный чат</h3>
                        <p className="text-gray-400 text-sm">
                            Общайтесь с AI через Telegram или веб-интерфейс
                        </p>
                    </div>
                    <div className="glass p-6 rounded-xl">
                        <Cloud className="w-8 h-8 text-blue-400 mb-3" />
                        <h3 className="text-lg font-semibold mb-2">Облачная синхронизация</h3>
                        <p className="text-gray-400 text-sm">
                            Яндекс.Диск и Obsidian для вашей базы знаний
                        </p>
                    </div>
                    <div className="glass p-6 rounded-xl">
                        <Shield className="w-8 h-8 text-green-400 mb-3" />
                        <h3 className="text-lg font-semibold mb-2">Безопасность</h3>
                        <p className="text-gray-400 text-sm">
                            Аутентификация через Telegram
                        </p>
                    </div>
                </div>

                {/* Login Section */}
                <div className="glass p-8 rounded-2xl text-center">
                    <h2 className="text-2xl font-bold mb-4">Войти в систему</h2>
                    <p className="text-gray-400 mb-6">
                        Используйте ваш Telegram аккаунт для входа
                    </p>
                    <TelegramLogin />
                </div>

                {/* Footer */}
                <div className="mt-12 text-center text-gray-500 text-sm">
                    <p>
                        Powered by GPT-4, LangGraph, and Telegram
                    </p>
                </div>
            </div>
        </main>
    );
}
