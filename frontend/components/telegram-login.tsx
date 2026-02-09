"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/lib/store";
import { authApi } from "@/lib/api";

declare global {
    interface Window {
        onTelegramAuth?: (user: any) => void;
    }
}

export function TelegramLogin() {
    const setAuth = useAuthStore((state) => state.setAuth);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // Handle Telegram auth callback
        window.onTelegramAuth = async (user: any) => {
            try {
                const response = await authApi.telegramLogin(user);
                setAuth(response.user, response.access_token);
            } catch (error) {
                console.error("Telegram login failed:", error);
                alert("Ошибка входа через Telegram");
            }
        };

        // Create login button
        if (containerRef.current) {
            const script = document.createElement("script");
            script.src = "https://telegram.org/js/telegram-widget.js?22";
            script.setAttribute("data-telegram-login", process.env.NEXT_PUBLIC_BOT_USERNAME || "");
            script.setAttribute("data-size", "large");
            script.setAttribute("data-onauth", "onTelegramAuth(user)");
            script.setAttribute("data-request-access", "write");
            script.async = true;

            containerRef.current.appendChild(script);
        }

        return () => {
            delete window.onTelegramAuth;
        };
    }, [setAuth]);

    return <div ref={containerRef} className="flex justify-center" />;
}
