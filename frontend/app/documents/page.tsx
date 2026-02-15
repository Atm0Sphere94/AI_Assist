"use client";

import { useState, useEffect, useRef } from "react";
import { documentsApi, foldersApi } from "@/lib/api";
import { Folder as FolderIcon, FileText, ChevronRight, Home, Plus, Trash2, ArrowLeft } from "lucide-react";

type Document = {
    id: number;
    filename: string;
    original_filename: string;
    file_size: number;
    document_type: string;
    is_processed: boolean;
    is_indexed: boolean;
    folder_id: number | null;
    created_at: string;
};

type Folder = {
    id: number;
    name: string;
    parent_id: number | null;
    created_at: string;
};

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [folders, setFolders] = useState<Folder[]>([]);
    const [currentFolderId, setCurrentFolderId] = useState<number | null>(null);
    const [breadcrumbs, setBreadcrumbs] = useState<{ id: number | null, name: string }[]>([{ id: null, name: "Документы" }]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [isCreatingFolder, setIsCreatingFolder] = useState(false);
    const [newFolderName, setNewFolderName] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchData(currentFolderId);
    }, [currentFolderId]);

    const fetchData = async (folderId: number | null) => {
        try {
            setLoading(true);
            const [docsData, foldersData] = await Promise.all([
                documentsApi.list(folderId || undefined),
                foldersApi.list(folderId || undefined)
            ]);
            setDocuments(docsData);
            setFolders(foldersData);

            // Update breadcrumbs if needed (simple approach: maintain history or fetch path)
            // For now, simple breadcrumb management:
            if (folderId === null) {
                setBreadcrumbs([{ id: null, name: "Документы" }]);
            }
        } catch (error) {
            console.error("Failed to fetch data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateFolder = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newFolderName.trim()) return;

        try {
            await foldersApi.create({
                name: newFolderName,
                parent_id: currentFolderId || undefined
            });
            setNewFolderName("");
            setIsCreatingFolder(false);
            fetchData(currentFolderId);
        } catch (error) {
            console.error("Failed to create folder:", error);
            alert("Ошибка при создании папки");
        }
    };

    const handleNavigate = async (folder: Folder) => {
        setCurrentFolderId(folder.id);
        setBreadcrumbs([...breadcrumbs, { id: folder.id, name: folder.name }]);
    };

    const handleNavigateUp = (index: number) => {
        const target = breadcrumbs[index];
        const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
        setBreadcrumbs(newBreadcrumbs);
        setCurrentFolderId(target.id);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            await documentsApi.upload(file, currentFolderId || undefined);
            await fetchData(currentFolderId);
        } catch (error) {
            console.error("Failed to upload document:", error);
            alert("Ошибка при загрузке файла");
        } finally {
            setUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        }
    };

    const handleDeleteDocument = async (id: number) => {
        if (!confirm("Вы уверены? Файл будет удален безвозвратно.")) return;
        try {
            await documentsApi.delete(id);
            setDocuments(documents.filter(d => d.id !== id));
        } catch (error) {
            console.error("Failed to delete document:", error);
        }
    };

    const handleDeleteFolder = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        if (!confirm("Вы уверены? Папка и все её содержимое (внимание!) будут удалены.")) return;
        try {
            await foldersApi.delete(id);
            setFolders(folders.filter(f => f.id !== id));
        } catch (error) {
            console.error("Failed to delete folder:", error);
            alert("Ошибка при удалении папки");
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-2 text-xl font-medium text-gray-800 dark:text-gray-200 overflow-hidden">
                    {breadcrumbs.map((crumb, index) => (
                        <div key={index} className="flex items-center">
                            {index > 0 && <ChevronRight size={20} className="text-gray-400 mx-1" />}
                            <button
                                onClick={() => handleNavigateUp(index)}
                                className={`hover:text-blue-600 transition-colors ${index === breadcrumbs.length - 1 ? "font-bold text-gray-900 dark:text-white" : "text-gray-500"}`}
                            >
                                {index === 0 && <Home size={18} className="inline mb-1 mr-1" />}
                                {crumb.name}
                            </button>
                        </div>
                    ))}
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={() => setIsCreatingFolder(true)}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 text-gray-700 dark:text-gray-200"
                    >
                        <Plus size={18} /> Новая папка
                    </button>

                    <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.txt,.md,.jpg,.jpeg,.png"
                    />
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {uploading ? "Загрузка..." : "📤 Загрузить файл"}
                    </button>
                </div>
            </div>

            {/* New Folder Modal/Input */}
            {isCreatingFolder && (
                <div className="mb-6 bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-blue-200 dark:border-blue-800">
                    <form onSubmit={handleCreateFolder} className="flex gap-2 items-center">
                        <FolderIcon size={20} className="text-blue-500" />
                        <input
                            type="text"
                            autoFocus
                            placeholder="Название папки"
                            value={newFolderName}
                            onChange={(e) => setNewFolderName(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                        />
                        <button
                            type="submit"
                            disabled={!newFolderName.trim()}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            Создать
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsCreatingFolder(false)}
                            className="px-4 py-2 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                        >
                            Отмена
                        </button>
                    </form>
                </div>
            )}

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : documents.length === 0 && folders.length === 0 ? (
                <div className="text-center py-16 text-gray-500 bg-white dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    <p className="text-4xl mb-4 opacity-50">📂</p>
                    <p className="text-lg">Папка пуста</p>
                    <div className="flex justify-center gap-4 mt-4">
                        <button onClick={() => setIsCreatingFolder(true)} className="text-blue-600 hover:underline">Создать папку</button>
                        <span className="text-gray-300">|</span>
                        <button onClick={() => fileInputRef.current?.click()} className="text-blue-600 hover:underline">Загрузить файл</button>
                    </div>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {/* Folders */}
                    {folders.map((folder) => (
                        <div
                            key={`folder-${folder.id}`}
                            onClick={() => handleNavigate(folder)}
                            className="cursor-pointer bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-transparent hover:border-blue-300 dark:hover:border-blue-600 hover:shadow-md transition-all group flex flex-col justify-between h-32"
                        >
                            <div className="flex justify-between items-start">
                                <FolderIcon size={40} className="text-blue-400 fill-blue-50 dark:fill-blue-900/20" />
                                <button
                                    onClick={(e) => handleDeleteFolder(e, folder.id)}
                                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                    title="Удалить папку"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <h3 className="font-medium text-gray-800 dark:text-gray-100 truncate mt-2" title={folder.name}>
                                {folder.name}
                            </h3>
                        </div>
                    ))}

                    {/* Documents */}
                    {documents.map((doc) => (
                        <div key={`doc-${doc.id}`} className="bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm border border-transparent hover:border-gray-300 dark:hover:border-gray-600 transition-all group relative flex flex-col justify-between h-32">
                            <div className="flex justify-between items-start">
                                <FileText size={40} className="text-gray-400 dark:text-gray-500" />
                                <div className="flex gap-1">
                                    {doc.is_indexed && (
                                        <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-1.5 py-0.5 rounded-full" title="Индексирован">
                                            ✓
                                        </span>
                                    )}
                                    <button
                                        onClick={() => handleDeleteDocument(doc.id)}
                                        className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-1"
                                        title="Удалить файл"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>

                            <div>
                                <h3 className="font-medium text-gray-800 dark:text-gray-200 truncate mb-1 text-sm" title={doc.original_filename}>
                                    {doc.original_filename}
                                </h3>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatSize(doc.file_size)}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
