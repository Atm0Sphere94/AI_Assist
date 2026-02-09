"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/lib/store";
import { ChatInterface } from "@/components/chat-interface";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";

export default function ChatPage() {
    const router = useRouter();
    const { user, isAuthenticated } = useAuthStore();
    const [sidebarOpen, setSidebarOpen] = useState(true);

    useEffect(() => {
        if (!isAuthenticated) {
            router.push("/");
        }
    }, [isAuthenticated, router]);

    if (!isAuthenticated) {
        return null;
    }

    return (
        <div className="flex h-screen bg-gradient-to-br from-gray-900 to-gray-800">
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            <div className="flex-1 flex flex-col">
                <Header onMenuClick={() => setSidebarOpen(!sidebarOpen)} />
                <ChatInterface />
            </div>
        </div>
    );
}
