"use client";

import { useState, useEffect, useRef } from "react";
import { documentsApi } from "@/lib/api";

type Document = {
    id: number;
    filename: string;
    original_filename: string;
    file_size: number;
    document_type: string;
    is_processed: boolean;
    is_indexed: boolean;
    created_at: string;
};

export default function DocumentsPage() {
    const [documents, setDocuments] = useState<Document[]>([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        fetchDocuments();
    }, []);

    const fetchDocuments = async () => {
        try {
            setLoading(true);
            const data = await documentsApi.list();
            setDocuments(data);
        } catch (error) {
            console.error("Failed to fetch documents:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setUploading(true);
            await documentsApi.upload(file);
            await fetchDocuments();
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

    const handleDelete = async (id: number) => {
        if (!confirm("Вы уверены? Файл будет удален безвозвратно.")) return;
        try {
            await documentsApi.delete(id);
            setDocuments(documents.filter(d => d.id !== id));
        } catch (error) {
            console.error("Failed to delete document:", error);
        }
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return "0 B";
        const k = 1024;
        const sizes = ["B", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    const getIcon = (type: string) => {
        switch (type) {
            case "pdf": return "📕";
            case "docx":
            case "doc": return "📘";
            case "txt": return "📄";
            case "image": return "🖼️";
            default: return "📁";
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Документы</h1>
                <div className="flex gap-4">
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
                    <button
                        onClick={fetchDocuments}
                        className="p-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                        title="Обновить"
                    >
                        🔄
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : documents.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-dashed border-gray-300 dark:border-gray-700">
                    <p className="text-4xl mb-4">📂</p>
                    <p className="text-lg">Нет загруженных документов</p>
                    <p className="text-sm mt-2">Загрузите файлы, чтобы использовать их в базе знаний</p>
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="mt-4 text-blue-600 hover:underline"
                    >
                        Загрузить первый файл
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {documents.map((doc) => (
                        <div key={doc.id} className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all group relative">
                            <div className="flex items-start justify-between mb-4">
                                <div className="text-3xl">{getIcon(doc.document_type)}</div>
                                <div className="flex gap-2">
                                    {doc.is_indexed && (
                                        <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-1 rounded-full flex items-center gap-1">
                                            ✓ В базе
                                        </span>
                                    )}
                                    <button
                                        onClick={() => handleDelete(doc.id)}
                                        className="text-gray-400 hover:text-red-500 transition-colors p-1"
                                        title="Удалить"
                                    >
                                        ✕
                                    </button>
                                </div>
                            </div>

                            <h3 className="font-medium text-gray-900 dark:text-white truncate mb-1" title={doc.original_filename}>
                                {doc.original_filename}
                            </h3>

                            <div className="text-xs text-gray-500 dark:text-gray-400 flex flex-col gap-1">
                                <span>{formatSize(doc.file_size)}</span>
                                <span>{new Date(doc.created_at).toLocaleDateString()} {new Date(doc.created_at).toLocaleTimeString()}</span>
                            </div>

                            {!doc.is_indexed && !doc.is_processed && (
                                <div className="mt-3 text-xs text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                                    ⏳ Ожидает обработки...
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
