import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";

const inter = Inter({ subsets: ["latin", "cyrillic"] });

export const metadata: Metadata = {
    title: "AI Jarvis - Your Personal AI Assistant",
    description: "Telegram AI Assistant with Knowledge Base",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="ru">
            <head>
                <script
                    async
                    src="https://telegram.org/js/telegram-widget.js?22"
                    data-telegram-login={process.env.NEXT_PUBLIC_BOT_USERNAME}
                    data-size="large"
                    data-onauth="onTelegramAuth(user)"
                    data-request-access="write"
                />
            </head>
            <body className={inter.className}>
                <Providers>{children}</Providers>
            </body>
        </html>
    );
}
