import axios from "axios";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        "Content-Type": "application/json",
    },
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem("auth-storage");
    if (token) {
        try {
            const { state } = JSON.parse(token);
            if (state.token) {
                config.headers.Authorization = `Bearer ${state.token}`;
            }
        } catch (e) {
            // Ignore
        }
    }
    return config;
});

// Auth API
export const authApi = {
    telegramLogin: async (authData: any) => {
        const { data } = await api.post("/api/auth/telegram/login", authData);
        return data;
    },
    getMe: async () => {
        const { data } = await api.get("/api/auth/me");
        return data;
    },
};

// Chat API
export const chatApi = {
    sendMessage: async (message: string) => {
        const { data } = await api.post("/api/chat/message", { message });
        return data;
    },
};

// Cloud Storage API
export const cloudStorageApi = {
    list: async () => {
        const { data } = await api.get("/api/cloud-storage/list");
        return data;
    },
    connect: async (storageData: any) => {
        const { data } = await api.post("/api/cloud-storage/connect", storageData);
        return data;
    },
    sync: async (storageId: number) => {
        const { data } = await api.post(`/api/cloud-storage/${storageId}/sync`);
        return data;
    },
    getStatus: async (storageId: number) => {
        const { data } = await api.get(`/api/cloud-storage/${storageId}/status`);
        return data;
    },
};

// Settings API
export const settingsApi = {
    getProfile: async () => {
        const { data } = await api.get("/api/settings/profile");
        return data;
    },
    updateProfile: async (profileData: any) => {
        const { data } = await api.put("/api/settings/profile", profileData);
        return data;
    },
};

// Tasks API
export const tasksApi = {
    list: async () => {
        const { data } = await api.get("/api/tasks/");
        return data;
    },
    create: async (taskData: any) => {
        const { data } = await api.post("/api/tasks/", taskData);
        return data;
    },
    update: async (taskId: number, taskData: any) => {
        const { data } = await api.put(`/api/tasks/${taskId}`, taskData);
        return data;
    },
    delete: async (taskId: number) => {
        const { data } = await api.delete(`/api/tasks/${taskId}`);
        return data;
    },
};
