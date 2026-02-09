"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    MessageSquare,
    ListTodo,
    Calendar,
    FileText,
    Brain,
    Cloud,
    Settings,
    X,
} from "lucide-react";
import clsx from "clsx";

interface SidebarProps {
    isOpen: boolean;
    onClose: () => void;
}

const navigation = [
    { name: "Чат", href: "/chat", icon: MessageSquare },
    { name: "Задачи", href: "/tasks", icon: ListTodo },
    { name: "Календарь", href: "/calendar", icon: Calendar },
    { name: "Документы", href: "/documents", icon: FileText },
    { name: "База знаний", href: "/knowledge", icon: Brain },
    { name: "Облако", href: "/cloud-storage", icon: Cloud },
    { name: "Настройки", href: "/settings", icon: Settings },
];

export function Sidebar({ isOpen, onClose }: SidebarProps) {
    const pathname = usePathname();

    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 lg:hidden z-40"
                    onClick={onClose}
                />
            )}

            {/* Sidebar */}
            <aside
                className={clsx(
                    "fixed lg:static inset-y-0 left-0 z-50 w-64 glass border-r border-gray-700/50 transform transition-transform duration-200 ease-in-out",
                    isOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
                )}
            >
                <div className="flex flex-col h-full p-4">
                    {/* Close button for mobile */}
                    <button
                        onClick={onClose}
                        className="lg:hidden self-end p-2 hover:bg-gray-700/50 rounded-lg mb-4"
                    >
                        <X className="w-5 h-5" />
                    </button>

                    {/* Navigation */}
                    <nav className="space-y-1">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const isActive = pathname === item.href;

                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => onClose()}
                                    className={clsx(
                                        "flex items-center gap-3 px-4 py-3 rounded-lg transition-colors",
                                        isActive
                                            ? "bg-indigo-600 text-white"
                                            : "text-gray-300 hover:bg-gray-700/50"
                                    )}
                                >
                                    <Icon className="w-5 h-5" />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>
                </div>
            </aside>
        </>
    );
}
