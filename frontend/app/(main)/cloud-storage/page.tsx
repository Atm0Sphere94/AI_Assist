"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { cloudStorageApi } from "@/lib/api";

type CloudStorage = {
    id: number;
    storage_type: string;
    name: string;
    sync_enabled: boolean;
    last_sync_at?: string;
    last_sync_status?: string;
    total_files_synced: number;
    included_paths?: string[];
    process_documents: boolean;
};

// Progress type
type SyncProgress = {
    current: number;
    total: number;
    percent: number;
    files: {
        processed: number;
        failed: number;
        new: number;
    };
};

// Folder Browser Component
function FolderBrowser({
    apiToken,
    storageType,
    storageId,
    selectedPaths,
    onSelectionChange
}: {
    apiToken?: string,
    storageType?: string,
    storageId?: number,
    selectedPaths: string[],
    onSelectionChange: (paths: string[]) => void
}) {
    const [currentPath, setCurrentPath] = useState("/");
    const [items, setItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [history, setHistory] = useState<string[]>([]);

    useEffect(() => {
        loadFolder(currentPath);
    }, [currentPath]);

    const loadFolder = async (path: string) => {
        try {
            setLoading(true);
            const data = await cloudStorageApi.listRemoteFiles({
                path,
                storage_type: storageType,
                access_token: apiToken?.trim(),
                storage_id: storageId
            });
            setItems(data.items);
        } catch (error) {
            console.error("Failed to list files:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleNavigate = (path: string) => {
        setHistory([...history, currentPath]);
        setCurrentPath(path);
    };

    const handleBack = () => {
        if (history.length > 0) {
            const prev = history[history.length - 1];
            setHistory(history.slice(0, -1));
            setCurrentPath(prev);
        }
    };

    const toggleSelection = (path: string) => {
        if (selectedPaths.includes(path)) {
            onSelectionChange(selectedPaths.filter(p => p !== path));
        } else {
            onSelectionChange([...selectedPaths, path]);
        }
    };

    return (
        <div className="border rounded-lg p-4 mt-4 h-64 flex flex-col dark:border-gray-700">
            <div className="flex items-center gap-2 mb-2 pb-2 border-b dark:border-gray-700">
                <button
                    onClick={handleBack}
                    disabled={history.length === 0}
                    className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-30"
                >
                    ⬅️
                </button>
                <span className="text-sm font-mono truncate flex-1 dark:text-gray-300">{currentPath}</span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-1">
                {loading ? (
                    <div className="flex justify-center p-4">
                        <div className="animate-spin h-5 w-5 border-2 border-blue-500 rounded-full border-t-transparent"></div>
                    </div>
                ) : items.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm py-4">Папка пуста</div>
                ) : (
                    items.map((item) => (
                        <div key={item.path} className="flex items-center gap-2 p-1 hover:bg-gray-50 dark:hover:bg-gray-700/50 rounded group">
                            <input
                                type="checkbox"
                                checked={selectedPaths.includes(item.path)}
                                onChange={() => toggleSelection(item.path)}
                                className="rounded border-gray-300"
                            />
                            <span
                                onClick={() => item.type === 'dir' && handleNavigate(item.path)}
                                className={`flex-1 text-sm cursor-pointer truncate ${item.type === 'dir' ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-gray-600 dark:text-gray-400'}`}
                            >
                                {item.type === 'dir' ? '📁' : '📄'} {item.name}
                            </span>
                        </div>
                    ))
                )}
            </div>
            <div className="mt-2 pt-2 border-t text-xs text-gray-500 dark:border-gray-700">
                Выбрано папок: {selectedPaths.length}
            </div>
        </div>
    );
}

export default function CloudStoragePage() {
    const [storages, setStorages] = useState<CloudStorage[]>([]);
    const [loading, setLoading] = useState(true);
    const [showConnectModal, setShowConnectModal] = useState(false);
    const [newStorage, setNewStorage] = useState({
        storage_type: "yandex_disk",
        name: "",
        access_token: "",
        process_documents: true,
    });
    const [connecting, setConnecting] = useState(false);

    // New state for folder selection
    const [showFolderBrowser, setShowFolderBrowser] = useState(false);
    const [selectedFolders, setSelectedFolders] = useState<string[]>([]);

    useEffect(() => {
        fetchStorages();
    }, []);

    const fetchStorages = async () => {
        try {
            setLoading(true);
            const data = await cloudStorageApi.list();
            setStorages(data);
        } catch (error) {
            console.error("Failed to fetch storages:", error);
        } finally {
            setLoading(false);
        }
    };

    const [progress, setProgress] = useState<Record<number, SyncProgress>>({});
    const [processDocs, setProcessDocs] = useState<Record<number, boolean>>({});

    // Polling for sync status
    useEffect(() => {
        const pollStatus = async () => {
            const updates: Record<number, SyncProgress> = {};
            let hasActiveSync = false;

            for (const storage of storages) {
                // Initialize processDocs state
                if (processDocs[storage.id] === undefined) {
                    setProcessDocs(prev => ({ ...prev, [storage.id]: storage.process_documents }));
                }

                if (storage.last_sync_status === 'in_progress' || storage.sync_enabled) {
                    try {
                        const status = await cloudStorageApi.getStatus(storage.id);
                        if (status.current_job && status.current_job.status === 'in_progress' && status.progress) {
                            updates[storage.id] = status.progress;
                            hasActiveSync = true;
                        } else if (progress[storage.id]) {
                            // Clear progress if finished
                            const newProgress = { ...progress };
                            delete newProgress[storage.id];
                            setProgress(newProgress);
                        }
                    } catch (e) {
                        console.error(`Failed to poll status for ${storage.id}`, e);
                    }
                }
            }

            if (Object.keys(updates).length > 0) {
                setProgress(prev => ({ ...prev, ...updates }));
            }
        };

        const interval = setInterval(pollStatus, 2000);
        return () => clearInterval(interval);
    }, [storages]);

    const handleConnect = async (e: FormEvent) => {
        e.preventDefault();
        try {
            setConnecting(true);
            // Include selected paths in payload
            const payload = {
                ...newStorage,
                access_token: newStorage.access_token.trim(),
                included_paths: selectedFolders.length > 0 ? selectedFolders : ["/"]
            };
            const created = await cloudStorageApi.connect(payload);
            setStorages([...storages, created]);
            setShowConnectModal(false);
            setNewStorage({ storage_type: "yandex_disk", name: "", access_token: "", process_documents: true });
            setSelectedFolders([]);
            setShowFolderBrowser(false);
        } catch (error) {
            console.error("Failed to connect storage:", error);
            alert("Ошибка подключения! Проверьте токен.");
        } finally {
            setConnecting(false);
        }
    };

    const handleSync = async (id: number) => {
        try {
            alert("Синхронизация запущена в фоне");
            await cloudStorageApi.sync(id);
            // Update local state to trigger polling immediately
            setStorages(storages.map(s => s.id === id ? { ...s, last_sync_status: 'in_progress' } : s));
        } catch (error) {
            console.error("Failed to start sync:", error);
        }
    };

    const toggleProcessDocs = async (id: number, enabled: boolean) => {
        try {
            // Optimistic update
            setProcessDocs(prev => ({ ...prev, [id]: enabled }));
            await cloudStorageApi.update(id, { process_documents: enabled });
            // Update storage list to reflect change
            setStorages(storages.map(s => s.id === id ? { ...s, process_documents: enabled } : s));
        } catch (error) {
            console.error("Failed to update process documents setting:", error);
            // Revert on failure
            setProcessDocs(prev => ({ ...prev, [id]: !enabled }));
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "yandex_disk": return "🛸";
            case "google_drive": return "🚙";
            case "icloud": return "☁️";
            default: return "💾";
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Облачное хранилище</h1>
                <button
                    onClick={() => setShowConnectModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                    <span>+</span> Подключить
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : storages.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                    <p className="text-lg">Нет подключенных хранилищ</p>
                    <p className="text-sm mt-2">Подключите Яндекс.Диск или другой сервис для синхронизации файлов</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {storages.map((storage) => (
                        <div key={storage.id} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl">{getIcon(storage.storage_type)}</span>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white">{storage.name}</h3>
                                        <p className="text-xs text-gray-500 uppercase">{storage.storage_type.replace('_', ' ')}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${storage.sync_enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600'}`}>
                                    {storage.sync_enabled ? 'Active' : 'Paused'}
                                </span>
                            </div>

                            <div className="space-y-3 mb-6">
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Файлов синхронизировано:</span>
                                    <span className="font-medium dark:text-gray-300">{storage.total_files_synced}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                    <span className="text-gray-500">Последняя синхронизация:</span>
                                    <span className="font-medium dark:text-gray-300">
                                        {storage.last_sync_at ? new Date(storage.last_sync_at).toLocaleString() : "Никогда"}
                                    </span>
                                </div>
                                {storage.included_paths && storage.included_paths.length > 0 && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-500">Папки:</span>
                                        <span className="font-medium dark:text-gray-300" title={storage.included_paths.join(', ')}>
                                            {storage.included_paths.length} шт.
                                        </span>
                                    </div>
                                )}

                                {/* Progress Bar */}
                                {progress[storage.id] && (
                                    <div className="mt-2 space-y-1">
                                        <div className="flex justify-between text-xs text-gray-500">
                                            <span>Синхронизация...</span>
                                            <span>{progress[storage.id].current} / {progress[storage.id].total}</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                                            <div
                                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                style={{ width: `${progress[storage.id].percent}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                )}

                                {/* Settings Toggle */}
                                <div className="pt-2 mt-2 border-t dark:border-gray-700">
                                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={processDocs[storage.id] ?? storage.process_documents ?? true}
                                            onChange={(e) => toggleProcessDocs(storage.id, e.target.checked)}
                                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                        />
                                        <span className="text-gray-600 dark:text-gray-400">Индексация для RAG</span>
                                    </label>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleSync(storage.id)}
                                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg text-sm font-medium transition-colors"
                                >
                                    🔄 Синхронизировать
                                </button>
                                <button
                                    className="px-3 py-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
                                    title="Настройки"
                                >
                                    ⚙️
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Connect Modal */}
            {showConnectModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Подключение хранилища</h2>
                        <form onSubmit={handleConnect} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Тип</label>
                                <select
                                    value={newStorage.storage_type}
                                    onChange={(e) => setNewStorage({ ...newStorage, storage_type: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="yandex_disk">Yandex Disk</option>
                                    <option value="icloud">iCloud (Obsidian)</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Название</label>
                                <input
                                    type="text"
                                    required
                                    value={newStorage.name}
                                    onChange={(e) => setNewStorage({ ...newStorage, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="Мой Диск"
                                />
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="processDocs"
                                    checked={newStorage.process_documents}
                                    onChange={(e) => setNewStorage({ ...newStorage, process_documents: e.target.checked })}
                                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <label htmlFor="processDocs" className="text-sm dark:text-gray-300">
                                    Индексировать документы (добавить в базу знаний)
                                </label>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                    {newStorage.storage_type === 'yandex_disk' ? 'OAuth Token' : 'Credentials (JSON)'}
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="password"
                                        required
                                        value={newStorage.access_token}
                                        onChange={(e) => setNewStorage({ ...newStorage, access_token: e.target.value })}
                                        className="flex-1 px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        placeholder="Введите токен..."
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowFolderBrowser(!showFolderBrowser)}
                                        disabled={!newStorage.access_token}
                                        className="px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 rounded-lg text-sm transition-colors"
                                    >
                                        📁 Выбрать папки
                                    </button>
                                </div>
                                <p className="text-xs text-gray-500 mt-1">
                                    {newStorage.storage_type === 'yandex_disk'
                                        ? 'Получите токен на https://oauth.yandex.ru/'
                                        : 'Введите учетные данные для доступа к iCloud.'}
                                </p>
                            </div>

                            {/* Folder Browsing Area */}
                            {showFolderBrowser && (
                                <FolderBrowser
                                    apiToken={newStorage.access_token}
                                    storageType={newStorage.storage_type}
                                    selectedPaths={selectedFolders}
                                    onSelectionChange={setSelectedFolders}
                                />
                            )}

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowConnectModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    disabled={connecting}
                                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50"
                                >
                                    {connecting ? "Подключение..." : "Подключить"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
