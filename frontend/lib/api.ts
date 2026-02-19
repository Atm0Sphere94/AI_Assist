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
    update: async (storageId: number, data: any) => {
        const { data: response } = await api.put(`/api/cloud-storage/${storageId}`, data);
        return response;
    },
    listRemoteFiles: async (params: any) => {
        const { data } = await api.get("/api/cloud-storage/list-remote-files", { params });
        return data;
    },
    disconnect: async (storageId: number) => {
        const { data } = await api.delete(`/api/cloud-storage/${storageId}`);
        return data;
    }
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
    toggle: async (taskId: number) => {
        const { data } = await api.post(`/api/tasks/${taskId}/toggle`);
        return data;
    }
};

export interface CloudStorage {
    id: number;
    storage_type: string;
    name: string;
    sync_path: string;
    included_paths?: string[];
    sync_enabled: boolean;
    auto_sync: boolean;
    sync_interval_minutes: number;
    last_sync_at?: string;
    last_sync_status?: string;
    last_error?: string;
    total_files_synced: number;
    total_files_processed: number;
    process_documents: boolean;
}

export interface SyncJob {
    id: number;
    storage_id: number;
    status: string;
    total_files: number;
    processed_files: number;
    failed_files: number;
    new_files: number;
    started_at?: string;
    completed_at?: string;
    error_message?: string;
}

export interface FileOperation {
    id: number;
    file_name: string;
    file_path: string;
    operation_type: string;
    status: string;
    error_message?: string;
    created_at: string;
}

export interface SyncStatus {
    storage: CloudStorage;
    current_job?: SyncJob;
    progress?: {
        current: number;
        total: number;
        percent: number;
        files: {
            processed: number;
            failed: number;
            new: number;
        }
    };
    recent_files: FileOperation[];
}

// Calendar API
export const calendarApi = {
    list: async (startDate?: string, endDate?: string) => {
        const params = new URLSearchParams();
        if (startDate) params.append("start_date", startDate);
        if (endDate) params.append("end_date", endDate);
        const { data } = await api.get(`/api/calendar/?${params.toString()}`);
        return data;
    },
    create: async (eventData: any) => {
        const { data } = await api.post("/api/calendar/", eventData);
        return data;
    },
    delete: async (eventId: number) => {
        const { data } = await api.delete(`/api/calendar/${eventId}`);
        return data;
    },
};

// Folders API
export const foldersApi = {
    list: async (parentId?: number) => {
        const params = new URLSearchParams();
        if (parentId) params.append("parent_id", parentId.toString());
        const { data } = await api.get(`/api/folders/?${params.toString()}`);
        return data;
    },
    create: async (folderData: { name: string; parent_id?: number }) => {
        const { data } = await api.post("/api/folders/", folderData);
        return data;
    },
    update: async (folderId: number, folderData: { name?: string; parent_id?: number }) => {
        const { data } = await api.put(`/api/folders/${folderId}`, folderData);
        return data;
    },
    delete: async (folderId: number) => {
        const { data } = await api.delete(`/api/folders/${folderId}`);
        return data;
    }
};

// Documents API
export const documentsApi = {
    list: async (folderId?: number, recursive?: boolean) => {
        const params: any = {};
        if (folderId !== undefined) params.folder_id = folderId;
        if (recursive) params.recursive = true;

        const { data } = await api.get("/api/documents/", { params });
        return data;
    },
    upload: async (file: File, folderId?: number) => {
        const formData = new FormData();
        formData.append("file", file);
        if (folderId) formData.append("folder_id", folderId.toString());
        const { data } = await api.post("/api/documents/upload", formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return data;
    },
    update: async (documentId: number, documentData: { filename?: string; folder_id?: number | null }) => {
        const { data } = await api.put(`/api/documents/${documentId}`, documentData);
        return data;
    },
    delete: async (documentId: number) => {
        const { data } = await api.delete(`/api/documents/${documentId}`);
        return data;
    },
    deleteFolder: async (folderId: number) => {
        const { data } = await api.delete(`/api/documents/folders/${folderId}`);
        return data;
    }
};

// Knowledge Base API
export const knowledgeApi = {
    search: async (query: string) => {
        const params = new URLSearchParams();
        params.append("q", query);
        const { data } = await api.get(`/api/knowledge/search?${params.toString()}`);
        return data;
    },
    index: async (documentId: number) => {
        const { data } = await api.post(`/api/knowledge/index/${documentId}`);
        return data;
    },
};
