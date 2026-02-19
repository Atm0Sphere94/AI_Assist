"use client";

import { useState, useEffect } from "react";
import { api, settingsApi } from "@/lib/api";
import { useRouter } from "next/navigation";

// Define User type locally or import if available
interface User {
    id: number;
    telegram_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    language_code?: string;
    settings?: {
        system_prompt?: string;
    };
}

export default function SettingsPage() {
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    // Form state
    const [firstName, setFirstName] = useState("");
    const [lastName, setLastName] = useState("");
    const [username, setUsername] = useState("");
    const [languageCode, setLanguageCode] = useState("ru");
    const [systemPrompt, setSystemPrompt] = useState("");

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            setLoading(true);
            const { data } = await api.get("/api/settings/profile");
            setUser(data);
            setFirstName(data.first_name || "");
            setLastName(data.last_name || "");
            setUsername(data.username || "");
            setLanguageCode(data.language_code || "ru");
            setSystemPrompt(data.settings?.system_prompt || "");
        } catch (error) {
            console.error("Failed to load profile:", error);
            setMessage({ text: "Не удалось загрузить профиль", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        setMessage(null);
        try {
            const { data } = await api.put("/api/settings/profile", {
                first_name: firstName,
                last_name: lastName,
                username: username,
                language_code: languageCode,
                settings: {
                    system_prompt: systemPrompt
                }
            });
            setUser(data);
            setMessage({ text: "Настройки сохранены!", type: "success" });
        } catch (error) {
            console.error("Failed to save profile:", error);
            setMessage({ text: "Ошибка при сохранении настроек.", type: "error" });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">Настройки</h1>

            {message && (
                <div className={`p-4 mb-6 rounded-lg ${message.type === "success" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                    {message.text}
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-8">
                <h2 className="text-xl font-semibold mb-6 text-gray-700 dark:text-gray-200">Профиль пользователя</h2>

                <form onSubmit={handleSave} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Имя
                            </label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Фамилия
                            </label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Язык (код)
                            </label>
                            <input
                                type="text"
                                value={languageCode}
                                onChange={(e) => setLanguageCode(e.target.value)}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                        <h3 className="text-lg font-medium mb-4 text-gray-700 dark:text-gray-200">Настройки AI</h3>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Базовый промпт (System Prompt)
                            </label>
                            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                Добавьте сюда инструкции, которые нейросеть будет учитывать в каждом диалоге.
                                Например: "Отвечай как пират", "Всегда предлагай план действий".
                            </p>
                            <textarea
                                value={systemPrompt}
                                onChange={(e) => setSystemPrompt(e.target.value)}
                                rows={4}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white resize-y"
                                placeholder="Введите дополнительные инструкции для AI..."
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                Telegram ID: <span className="font-mono">{user?.telegram_id}</span>
                            </div>
                            <button
                                type="submit"
                                disabled={saving}
                                className={`px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors ${saving ? "opacity-50 cursor-not-allowed" : ""}`}
                            >
                                {saving ? "Сохранение..." : "Сохранить изменения"}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
}
