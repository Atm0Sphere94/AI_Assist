"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/lib/store";
import { chatApi } from "@/lib/api";
import { Send, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { ru } from "date-fns/locale";

export function ChatInterface() {
    const { messages, addMessage } = useChatStore();
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput("");

        // Add user message
        addMessage({ role: "user", content: userMessage });

        // Send to API
        setIsLoading(true);
        try {
            const response = await chatApi.sendMessage(userMessage);
            addMessage({ role: "assistant", content: response.message });
        } catch (error) {
            console.error("Chat error:", error);
            addMessage({
                role: "assistant",
                content: "Извините, произошла ошибка. Попробуйте еще раз.",
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full">
            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center text-gray-400">
                            <h3 className="text-xl font-semibold mb-2">
                                Начните разговор
                            </h3>
                            <p>Задайте вопрос или попросите помощи</p>
                        </div>
                    </div>
                ) : (
                    messages.map((message) => (
                        <div
                            key={message.id}
                            className={`flex ${message.role === "user" ? "justify-end" : "justify-start"
                                }`}
                        >
                            <div
                                className={`max-w-[70%] rounded-2xl px-4 py-3 ${message.role === "user"
                                        ? "bg-indigo-600 text-white"
                                        : "glass text-gray-100"
                                    }`}
                            >
                                {message.role === "assistant" ? (
                                    <div className="prose prose-invert max-w-none">
                                        <ReactMarkdown>{message.content}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <p className="whitespace-pre-wrap">{message.content}</p>
                                )}
                                <div
                                    className={`text-xs mt-2 ${message.role === "user"
                                            ? "text-indigo-200"
                                            : "text-gray-500"
                                        }`}
                                >
                                    {format(message.timestamp, "HH:mm", { locale: ru })}
                                </div>
                            </div>
                        </div>
                    ))
                )}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="glass rounded-2xl px-4 py-3">
                            <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-4 glass border-t border-gray-700/50">
                <div className="flex gap-2 items-end">
                    <textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyPress={handleKeyPress}
                        placeholder="Напишите сообщение..."
                        className="flex-1 bg-gray-800/50 text-white rounded-xl px-4 py-3 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 max-h-32"
                        rows={1}
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() || isLoading}
                        className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-xl p-3 transition-colors"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
    );
}
