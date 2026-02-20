import { create } from "zustand";
import { persist } from "zustand/middleware";

interface User {
    id: number;
    telegram_id: number;
    username?: string;
    first_name: string;
    last_name?: string;
    is_admin: boolean;
}

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    setAuth: (user: User, token: string) => void;
    logout: () => void;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            setAuth: (user, token) =>
                set({ user, token, isAuthenticated: true }),
            logout: () =>
                set({ user: null, token: null, isAuthenticated: false }),
        }),
        {
            name: "auth-storage",
        }
    )
);

interface Message {
    id: string; // Used for local rendering keys
    db_id?: number; // Real ID from DB if loaded from history
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: Date;
}

interface ChatSessionClient {
    id: number;
    title: string;
    updatedAt: Date;
}

interface ChatState {
    messages: Message[];
    sessions: ChatSessionClient[];
    currentSessionId: number | null;

    // Actions
    addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
    setMessages: (messages: Message[]) => void;
    clearMessages: () => void;

    setSessions: (sessions: ChatSessionClient[]) => void;
    setCurrentSession: (id: number | null) => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    sessions: [],
    currentSessionId: null,

    addMessage: (message) =>
        set((state) => ({
            messages: [
                ...state.messages,
                {
                    ...message,
                    id: Date.now().toString() + Math.random().toString(),
                    timestamp: new Date(),
                },
            ],
        })),

    setMessages: (messages) => set({ messages }),
    clearMessages: () => set({ messages: [], currentSessionId: null }),

    setSessions: (sessions) => set({ sessions }),
    setCurrentSession: (id) => set({ currentSessionId: id }),
}));
