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
    id: string;
    role: "user" | "assistant";
    content: string;
    timestamp: Date;
}

interface ChatState {
    messages: Message[];
    addMessage: (message: Omit<Message, "id" | "timestamp">) => void;
    clearMessages: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
    messages: [],
    addMessage: (message) =>
        set((state) => ({
            messages: [
                ...state.messages,
                {
                    ...message,
                    id: Date.now().toString(),
                    timestamp: new Date(),
                },
            ],
        })),
    clearMessages: () => set({ messages: [] }),
}));
