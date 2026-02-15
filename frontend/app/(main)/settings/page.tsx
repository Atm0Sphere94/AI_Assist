"use client";

import { useState, useEffect } from "react";
import { settingsApi } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
    const router = useRouter();
    const [profile, setProfile] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

    useEffect(() => {
        fetchProfile();
    }, []);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            const data = await settingsApi.getProfile();
            setProfile(data);
        } catch (error) {
            console.error("Failed to fetch profile:", error);
            setMessage({ text: "Не удалось загрузить профиль", type: "error" });
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSaving(true);
            setMessage(null);

            const updated = await settingsApi.updateProfile({
                first_name: profile.first_name,
                last_name: profile.last_name,
                username: profile.username,
                language_code: profile.language_code
            });

            setProfile(updated);
            setMessage({ text: "Профиль успешно обновлен", type: "success" });
        } catch (error) {
            console.error("Failed to update profile:", error);
            setMessage({ text: "Ошибка при сохранении", type: "error" });
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

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Имя
                            </label>
                            <input
                                type="text"
                                value={profile?.first_name || ""}
                                onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Фамилия
                            </label>
                            <input
                                type="text"
                                value={profile?.last_name || ""}
                                onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                value={profile?.username || ""}
                                onChange={(e) => setProfile({ ...profile, username: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                Язык (код)
                            </label>
                            <input
                                type="text"
                                value={profile?.language_code || ""}
                                onChange={(e) => setProfile({ ...profile, language_code: e.target.value })}
                                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                            />
                        </div>
                    </div>

                    <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center justify-between">
                            <div className="text-sm text-gray-500">
                                Telegram ID: <span className="font-mono">{profile?.telegram_id}</span>
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
