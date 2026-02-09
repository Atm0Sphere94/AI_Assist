"use client";

import { useAuthStore } from "@/lib/store";
import { Menu, User, LogOut } from "lucide-react";

interface HeaderProps {
    onMenuClick: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
    const { user, logout } = useAuthStore();

    return (
        <header className="glass border-b border-gray-700/50 px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
                <button
                    onClick={onMenuClick}
                    className="lg:hidden p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                    <Menu className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold text-gradient">AI Jarvis</h1>
            </div>

            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4" />
                    <span>{user?.first_name}</span>
                    {user?.is_admin && (
                        <span className="bg-purple-600 text-xs px-2 py-0.5 rounded">
                            Admin
                        </span>
                    )}
                </div>
                <button
                    onClick={logout}
                    className="p-2 hover:bg-gray-700/50 rounded-lg transition-colors"
                >
                    <LogOut className="w-4 h-4" />
                </button>
            </div>
        </header>
    );
}
