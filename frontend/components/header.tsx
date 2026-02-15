"use client";

import { useAuthStore } from "@/lib/store";
import { Menu, User, LogOut, ArrowLeft } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";

interface HeaderProps {
    onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
    const { user, logout } = useAuthStore();
    const router = useRouter();
    const pathname = usePathname();

    // Show back button everywhere except the main dashboard (chat) if desired
    // User asked for "all sections", so let's show it everywhere, possibly excluding /chat if it's the home.
    // Let's hide it on /chat to avoid confusion if it's the landing.
    const showBackButton = pathname !== "/chat";

    return (
        <header className="glass border-b border-gray-700/50 px-4 py-3 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>

                {showBackButton && (
                    <button
                        onClick={() => router.back()}
                        className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors mr-1"
                        title="Назад"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}

                <h1 className="text-xl font-bold text-gradient">AI Jarvis</h1>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4" />
                    <span className="hidden sm:inline">{user?.first_name}</span>
                    {user?.is_admin && (
                        <span className="bg-purple-600 text-xs px-2 py-0.5 rounded">
                            Admin
                        </span>
                    )}
                </div>
                <button
                    onClick={logout}
                    className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                    title="Выйти"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </header>
    );
}
