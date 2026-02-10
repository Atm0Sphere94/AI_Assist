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
        // Defines the global handler
        window.onTelegramAuth = async (user: any) => {
            try {
                const response = await authApi.telegramLogin(user);
                setAuth(response.user, response.access_token);
            } catch (error) {
                console.error("Telegram login failed:", error);
                alert("Ошибка входа через Telegram");
            }
        };

        const container = containerRef.current;
        if (container) {
            // Check if script already exists to prevent duplicates
            if (container.querySelector("script")) {
                return;
            }

            const script = document.createElement("script");
            script.src = "https://telegram.org/js/telegram-widget.js?22";
            script.setAttribute("data-telegram-login", process.env.NEXT_PUBLIC_BOT_USERNAME || "");
            script.setAttribute("data-size", "large");
            script.setAttribute("data-onauth", "onTelegramAuth(user)");
            script.setAttribute("data-request-access", "write");
            script.async = true;

            container.appendChild(script);
        }

        return () => {
            // Cleanup: remove the script but DO NOT remove the global handler immediately
            // to avoid race conditions if the widget tries to call it during unmount.
            // However, we should remove the script to allow re-mounting.
            if (container) {
                const script = container.querySelector("script");
                if (script) {
                    container.removeChild(script);
                }
            }
            // Ideally we keep window.onTelegramAuth or execute a cleanup with a small delay,
            // but for now, let's just leave it attached as it's harmless.
        };
    }, [setAuth]);

    return <div ref={containerRef} className="flex justify-center min-h-[40px]" />;
}
