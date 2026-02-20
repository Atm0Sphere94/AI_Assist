"use client";

import { useState, useRef, useEffect } from "react";
import { useChatStore } from "@/lib/store";
import { chatApi } from "@/lib/api";
import { Send, Loader2, MessageSquarePlus, MessageSquare, Trash2, Menu } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { format } from "date-fns";
import { ru } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function ChatInterface() {
    const {
        messages,
        addMessage,
        setMessages,
        sessions,
        setSessions,
        currentSessionId,
        setCurrentSession,
        clearMessages
    } = useChatStore();

    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    // Load sessions on mount
    useEffect(() => {
        loadSessions();
    }, []);

    const loadSessions = async () => {
        try {
            const data = await chatApi.getSessions();
            const formattedSessions = data.map((s) => ({
                id: s.id,
                title: s.title,
                updatedAt: new Date(s.updated_at)
            }));
            setSessions(formattedSessions);

            // If we have sessions and nothing is selected, select the first one
            if (formattedSessions.length > 0 && currentSessionId === null) {
                handleSessionSelect(formattedSessions[0].id);
            }
        } catch (error) {
            console.error("Failed to load sessions:", error);
        }
    };

    const handleSessionSelect = async (sessionId: number) => {
        setCurrentSession(sessionId);
        setIsLoading(true);
        try {
            const msgs = await chatApi.getSessionMessages(sessionId);
            const formattedMsgs = msgs.map((m) => ({
                id: m.id.toString(),
                db_id: m.id,
                role: m.role as "user" | "assistant" | "system",
                content: m.content,
                timestamp: new Date(m.created_at)
            }));
            setMessages(formattedMsgs);
        } catch (error) {
            console.error("Failed to load session messages:", error);
        } finally {
            setIsLoading(false);
            // On mobile, close sidebar after selection
            if (window.innerWidth < 768) {
                setIsSidebarOpen(false);
            }
        }
    };

    const handleNewChat = () => {
        setCurrentSession(null);
        clearMessages();
        if (window.innerWidth < 768) {
            setIsSidebarOpen(false);
        }
    };

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput("");

        // Add user message locally
        addMessage({ role: "user", content: userMessage });
        setIsLoading(true);

        try {
            const response = await chatApi.sendMessage(
                userMessage,
                currentSessionId || undefined
            );

            addMessage({ role: "assistant", content: response.message });

            // If this was a new session (we didn't have currentSessionId), 
            // the server just created one and returned its ID. We need to update our state.
            if (!currentSessionId && response.session_id) {
                setCurrentSession(response.session_id);
                // Reload sessions to get the new title
                await loadSessions();
            }

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
        <div className="flex-1 flex h-full overflow-hidden bg-background">
            {/* Mobile Sidebar Toggle Layer */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 md:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Sidebar (Chat Library) */}
            <div className={cn(
                "fixed inset-y-0 left-0 z-50 w-72 bg-card border-r border-border/40 flex flex-col transition-transform duration-300 ease-in-out md:relative md:translate-x-0",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-4 border-b border-border/40">
                    <Button
                        onClick={handleNewChat}
                        className="w-full justify-start gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-none"
                        variant="outline"
                    >
                        <MessageSquarePlus className="w-5 h-5" />
                        <span className="font-medium">Новый диалог</span>
                    </Button>
                </div>

                <div className="flex-1 overflow-y-auto p-3 space-y-1">
                    <div className="px-2 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                        История
                    </div>
                    {sessions.map((session) => (
                        <button
                            key={session.id}
                            onClick={() => handleSessionSelect(session.id)}
                            className={cn(
                                "w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition-colors group",
                                currentSessionId === session.id
                                    ? "bg-muted text-foreground"
                                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <MessageSquare className="w-4 h-4 mt-0.5 opacity-70 flex-shrink-0" />
                            <div className="flex-1 min-w-0 pr-2">
                                <div className="text-sm font-medium truncate">{session.title}</div>
                                <div className="text-xs opacity-60 mt-0.5">
                                    {format(session.updatedAt, "dd MMM, HH:mm", { locale: ru })}
                                </div>
                            </div>
                        </button>
                    ))}
                    {sessions.length === 0 && (
                        <div className="text-center p-4 text-sm text-muted-foreground">
                            У вас пока нет сохраненных диалогов
                        </div>
                    )}
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0 h-full relative">
                {/* Mobile Header */}
                <div className="md:hidden flex items-center p-4 border-b border-border/40 bg-card/50 backdrop-blur-sm z-10 absolute top-0 left-0 right-0">
                    <Button variant="ghost" size="icon" onClick={() => setIsSidebarOpen(true)}>
                        <Menu className="w-5 h-5" />
                    </Button>
                    <span className="ml-3 font-medium">
                        {currentSessionId ? sessions.find(s => s.id === currentSessionId)?.title : 'Новый диалог'}
                    </span>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6 pt-20 md:pt-6">
                    {messages.length === 0 ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <MessageSquare className="w-8 h-8 text-primary" />
                                </div>
                                <h3 className="text-xl font-semibold mb-2 text-foreground">
                                    Отправьте сообщение
                                </h3>
                                <p className="max-w-sm mx-auto text-sm">
                                    Jarvis запомнит этот разговор, чтобы учитывать контекст в будущем.
                                </p>
                            </div>
                        </div>
                    ) : (
                        <div className="max-w-3xl mx-auto space-y-6">
                            {messages.map((message) => (
                                <div
                                    key={message.id}
                                    className={cn("flex", message.role === "user" ? "justify-end" : "justify-start")}
                                >
                                    <div
                                        className={cn(
                                            "max-w-[85%] md:max-w-[75%] rounded-2xl px-5 py-3.5 shadow-sm",
                                            message.role === "user"
                                                ? "bg-primary text-primary-foreground rounded-br-sm"
                                                : "bg-muted border border-border/40 text-foreground rounded-bl-sm"
                                        )}
                                    >
                                        {message.role === "assistant" ? (
                                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                                <ReactMarkdown>{message.content}</ReactMarkdown>
                                            </div>
                                        ) : (
                                            <p className="whitespace-pre-wrap text-sm leading-relaxed">{message.content}</p>
                                        )}
                                        <div
                                            className={cn(
                                                "text-[10px] mt-2 font-medium tracking-wide",
                                                message.role === "user"
                                                    ? "text-primary-foreground/70"
                                                    : "text-muted-foreground/70"
                                            )}
                                        >
                                            {format(message.timestamp, "HH:mm", { locale: ru })}
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {isLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-muted border border-border/40 rounded-2xl rounded-bl-sm px-5 py-3.5 shadow-sm">
                                        <div className="flex items-center gap-2 text-muted-foreground">
                                            <Loader2 className="w-4 h-4 animate-spin text-primary" />
                                            <span className="text-sm font-medium">Jarvis печатает...</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={messagesEndRef} className="h-4" />
                        </div>
                    )}
                </div>

                {/* Input Area */}
                <div className="p-4 bg-background/80 backdrop-blur-xl border-t border-border/40 z-10">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex gap-2 items-end relative shadow-sm bg-muted/50 rounded-2xl border border-border/50 p-1 focus-within:ring-2 focus-within:ring-primary/20 focus-within:border-primary/50 transition-all">
                            <textarea
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Напишите сообщение..."
                                className="flex-1 bg-transparent text-foreground rounded-xl px-4 py-3 resize-none focus:outline-none max-h-32 min-h-[52px] text-sm"
                                rows={1}
                                disabled={isLoading}
                            />
                            <Button
                                onClick={handleSend}
                                disabled={!input.trim() || isLoading}
                                size="icon"
                                className="h-11 w-11 rounded-xl mb-1 mr-1 shadow-md bg-primary hover:bg-primary/90 transition-all duration-200"
                            >
                                <Send className="w-4 h-4 ml-0.5" />
                            </Button>
                        </div>
                        <div className="text-center mt-2 text-[10px] text-muted-foreground font-medium">
                            Jarvis может допускать ошибки. Проверяйте важную информацию.
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
