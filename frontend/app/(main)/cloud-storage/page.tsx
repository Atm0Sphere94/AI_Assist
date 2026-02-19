"use client";

import React, { useState, useEffect, FormEvent } from "react";
import { cloudStorageApi, CloudStorage } from "@/lib/api";

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

// Sync Detail Modal
function SyncDetailsModal({
    storage,
    onClose
}: {
    storage: CloudStorage,
    onClose: () => void
}) {
    const [status, setStatus] = useState<any>(null);
    const [visible, setVisible] = useState(true);

    useEffect(() => {
        const fetchStatus = async () => {
            try {
                const data = await cloudStorageApi.getStatus(storage.id);
                setStatus(data);
            } catch (e) {
                console.error(e);
            }
        };

        fetchStatus();
        const interval = setInterval(fetchStatus, 2000);
        return () => clearInterval(interval);
    }, [storage.id]);

    const handleClose = () => {
        setVisible(false);
        setTimeout(onClose, 300);
    };

    if (!status) return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-8 animate-pulse">
                Loading...
            </div>
        </div>
    );

    const { current_job, progress, recent_files } = status;
    const isSyncing = current_job?.status === 'in_progress';

    return (
        <div className={`fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50 transition-opacity duration-300 ${visible ? 'opacity-100' : 'opacity-0'}`}>
            <div className={`bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col transform transition-all duration-300 ${visible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                {/* Header */}
                <div className="p-6 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            {storage.name}
                            <span className={`text-xs px-2 py-1 rounded-full ${isSyncing ? 'bg-blue-100 text-blue-700 animate-pulse' : 'bg-gray-100 text-gray-600'}`}>
                                {isSyncing ? 'SYNCING' : 'IDLE'}
                            </span>
                        </h2>
                        <p className="text-sm text-gray-500">Детали синхронизации</p>
                    </div>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 overflow-y-auto flex-1">
                    {/* Progress Card */}
                    {isSyncing && progress && (
                        <div className="mb-8 p-6 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-800">
                            <div className="flex justify-between items-end mb-2">
                                <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                                    {progress.percent}%
                                </span>
                                <span className="text-sm text-gray-600 dark:text-gray-400">
                                    {progress.current} / {progress.total} файлов
                                </span>
                            </div>
                            <div className="w-full bg-blue-200 dark:bg-blue-900 rounded-full h-3 overflow-hidden">
                                <div
                                    className="bg-blue-600 h-full rounded-full transition-all duration-500 ease-out"
                                    style={{ width: `${progress.percent}%` }}
                                ></div>
                            </div>
                            <div className="grid grid-cols-3 gap-4 mt-4 text-center">
                                <div className="bg-white dark:bg-gray-800 p-2 rounded shadow-sm">
                                    <div className="text-xl font-bold text-green-500">{progress.files.processed}</div>
                                    <div className="text-xs text-gray-500">Обработано</div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-2 rounded shadow-sm">
                                    <div className="text-xl font-bold text-blue-500">{progress.files.new}</div>
                                    <div className="text-xs text-gray-500">Новых</div>
                                </div>
                                <div className="bg-white dark:bg-gray-800 p-2 rounded shadow-sm">
                                    <div className="text-xl font-bold text-red-500">{progress.files.failed}</div>
                                    <div className="text-xs text-gray-500">Ошибок</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Recent Activity */}
                    <h3 className="font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center gap-2">
                        <span>📋</span> Текущие операции
                    </h3>
                    <div className="space-y-2">
                        {recent_files && recent_files.length > 0 ? (
                            recent_files.map((file: any) => (
                                <div key={file.id} className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-100 dark:border-gray-700 hover:border-blue-200 transition-colors">
                                    <div className={`p-2 rounded-full ${file.status === 'completed' ? 'bg-green-100 text-green-600' :
                                        file.status === 'failed' ? 'bg-red-100 text-red-600' :
                                            'bg-blue-100 text-blue-600 animate-pulse'
                                        }`}>
                                        {file.status === 'completed' ? '✓' : file.status === 'failed' ? '✕' : '⟳'}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-gray-800 dark:text-gray-200 truncate" title={file.file_name}>
                                            {file.file_name}
                                        </div>
                                        <div className="text-xs text-gray-500 truncate" title={file.file_path}>
                                            {file.operation_type} • {new Date(file.created_at).toLocaleTimeString()}
                                        </div>
                                    </div>
                                    {file.status === 'failed' && (
                                        <div className="text-xs text-red-500 max-w-[150px] truncate" title={file.error_message}>
                                            {file.error_message}
                                        </div>
                                    )}
                                </div>
                            ))
                        ) : isSyncing ? (
                            <div className="text-center py-8 text-blue-600 dark:text-blue-400 border-2 dashed border-blue-200 dark:border-blue-800 rounded-lg animate-pulse flex flex-col items-center gap-2">
                                <div className="text-2xl">🔍</div>
                                <div>Сканирование списка файлов...</div>
                                <div className="text-xs opacity-75">Это может занять некоторое время</div>
                            </div>
                        ) : (
                            <div className="text-center py-8 text-gray-400 border-2 dashed border-gray-200 dark:border-gray-700 rounded-lg">
                                Нет активных операций
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

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

    // Helper to clean token
    const sanitizeToken = (token?: string) => {
        if (!token) return "";
        // Remove trailing :line_number artifacts (e.g. :1) and whitespace
        return token.replace(/:\d+$/, '').trim();
    };

    const loadFolder = async (path: string) => {
        try {
            setLoading(true);
            const data = await cloudStorageApi.listRemoteFiles({
                path,
                storage_type: storageType,
                access_token: sanitizeToken(apiToken),
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
                            {/* Visual indicator for selected folders */}
                            {item.type === 'dir' && selectedPaths.includes(item.path) && (
                                <span className="text-xs text-green-600 dark:text-green-400 font-medium" title="Все вложенные файлы будут синхронизированы">
                                    ✓ +вложенные
                                </span>
                            )}
                        </div>
                    ))
                )}
            </div>
            <div className="mt-2 pt-2 border-t text-xs text-gray-500 dark:border-gray-700">
                Выбрано папок: {selectedPaths.length}
                {selectedPaths.length > 0 && (
                    <span className="ml-2 text-green-600 dark:text-green-400">
                        (включая все вложенные файлы)
                    </span>
                )}
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
    // New state for folder selection
    const [showFolderBrowser, setShowFolderBrowser] = useState(false);
    const [selectedFolders, setSelectedFolders] = useState<string[]>([]);

    // State for editing existing storage
    const [editingStorage, setEditingStorage] = useState<CloudStorage | null>(null);
    const [selectedStorage, setSelectedStorage] = useState<CloudStorage | null>(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [updating, setUpdating] = useState(false);

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
                        if (status.current_job && status.current_job.status === 'in_progress') {
                            hasActiveSync = true;
                            if (status.progress) {
                                updates[storage.id] = status.progress;
                            } else {
                                // Job is running but scanning files (progress not yet available)
                                updates[storage.id] = {
                                    current: 0,
                                    total: 0,
                                    percent: 0,
                                    files: { processed: 0, failed: 0, new: 0 }
                                };
                            }
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

            // Sanitize token (remove :1 artifacts from copy-paste)
            const cleanToken = newStorage.access_token.replace(/:\d+$/, '').trim();

            // Include selected paths in payload
            const payload = {
                ...newStorage,
                access_token: cleanToken,
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

    const handleEdit = (storage: CloudStorage) => {
        setEditingStorage(storage);
        setSelectedFolders(storage.included_paths || ["/"]);
        setShowEditModal(true);
        // Reset browser state by forcing a re-mount or similar if needed, 
        // but FolderBrowser uses internal state. We might need to ensure it resets.
    };

    const handleUpdate = async (e: FormEvent) => {
        e.preventDefault();
        if (!editingStorage) return;

        try {
            setUpdating(true);
            const updated = await cloudStorageApi.update(editingStorage.id, {
                included_paths: selectedFolders.length > 0 ? selectedFolders : ["/"],
                // We could also update name or other fields here if we added inputs for them
            });

            setStorages(storages.map(s => s.id === editingStorage.id ? updated : s));
            setShowEditModal(false);
            setEditingStorage(null);
        } catch (error) {
            console.error("Failed to update storage:", error);
            alert("Не удалось сохранить настройки.");
        } finally {
            setUpdating(false);
        }
    };

    const handleDisconnect = async (id: number) => {
        if (!confirm("Вы уверены, что хотите отключить это хранилище? Все синхронизированные файлы останутся, но синхронизация остановится.")) return;

        try {
            await cloudStorageApi.disconnect(id);
            setStorages(storages.filter(s => s.id !== id));
        } catch (error) {
            console.error("Failed to disconnect storage:", error);
            alert("Не удалось отключить хранилище.");
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
                        <div
                            key={storage.id}
                            onClick={() => setSelectedStorage(storage)}
                            className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-transparent hover:border-blue-400 dark:hover:border-blue-500 transition-all cursor-pointer group"
                        >
                            <div className="flex justify-between items-start mb-4">
                                <div className="flex items-center gap-3">
                                    <span className="text-3xl transform group-hover:scale-110 transition-transform">{getIcon(storage.storage_type)}</span>
                                    <div>
                                        <h3 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{storage.name}</h3>
                                        <p className="text-xs text-gray-500 uppercase">{storage.storage_type.replace('_', ' ')}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-1 rounded text-xs font-medium ${storage.sync_enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-gray-100 text-gray-600'}`}>
                                    {progress ? (storage.process_documents ? 'Indexing...' : 'Syncing...') : (storage.sync_enabled ? 'Active' : 'Paused')}
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
                                {storage.last_error && (
                                    <div className="p-2 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-800 rounded text-xs text-red-600 dark:text-red-400 break-words">
                                        Error: {storage.last_error}
                                    </div>
                                )}
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
                                            <span>
                                                {progress[storage.id].total === 0
                                                    ? "Сканирование файлов..."
                                                    : "Синхронизация..."}
                                            </span>
                                            <span>
                                                {progress[storage.id].total > 0
                                                    ? `${progress[storage.id].current} / ${progress[storage.id].total}`
                                                    : ""}
                                            </span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700 overflow-hidden">
                                            {progress[storage.id].total === 0 ? (
                                                <div className="bg-blue-600 h-2 rounded-full w-1/3 animate-indeterminate-slide"></div>
                                            ) : (
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${progress[storage.id].percent}%` }}
                                                ></div>
                                            )}
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
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleSync(storage.id);
                                    }}
                                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg text-sm font-medium transition-colors"
                                >
                                    🔄 Синхронизировать
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEdit(storage);
                                    }}
                                    className="px-3 py-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-lg transition-colors border border-gray-200 dark:border-gray-700"
                                    title="Настройки"
                                >
                                    ⚙️
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDisconnect(storage.id);
                                    }}
                                    className="px-3 py-2 text-red-400 hover:text-red-600 dark:hover:text-red-300 rounded-lg transition-colors border border-gray-200 dark:border-gray-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    title="Отключить"
                                >
                                    🗑️
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

            {/* Edit Storage Modal */}
            {showEditModal && editingStorage && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Настройки хранилища</h2>
                        <h3 className="text-md text-gray-500 mb-4">{editingStorage.name}</h3>

                        <form onSubmit={handleUpdate} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                                    Выберите папки для синхронизации
                                </label>

                                <FolderBrowser
                                    storageId={editingStorage.id}
                                    storageType={editingStorage.storage_type}
                                    selectedPaths={selectedFolders}
                                    onSelectionChange={setSelectedFolders}
                                />
                                <p className="text-xs text-gray-500 mt-2">
                                    <span className="inline-block mr-1">💡</span>
                                    <strong>Примечание:</strong> При выборе папки автоматически синхронизируются все вложенные файлы и подпапки.
                                </p>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setEditingStorage(null);
                                    }}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    disabled={updating}
                                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50"
                                >
                                    {updating ? "Сохранение..." : "Сохранить"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Details Modal */}
            {selectedStorage && (
                <SyncDetailsModal
                    storage={selectedStorage}
                    onClose={() => setSelectedStorage(null)}
                />
            )}
        </div>
    );
}
