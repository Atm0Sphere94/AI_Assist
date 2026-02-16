"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";

interface FolderNode {
    id: number;
    name: string;
    parent_id: number | null;
    children: FolderNode[];
    document_count: number;
}

interface Document {
    id: number;
    filename: string;
    original_filename: string;
    file_size: number;
    document_type: string;
    is_indexed: boolean;
    created_at: string;
    folder_id: number | null;
}

export default function DocumentsPage() {
    const [folders, setFolders] = useState<FolderNode[]>([]);
    const [selectedFolder, setSelectedFolder] = useState<number | null>(null);
    const [documents, setDocuments] = useState<Document[]>([]);
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadFolders();
    }, []);

    useEffect(() => {
        if (selectedFolder !== null) {
            loadFolderDocuments(selectedFolder);
        }
    }, [selectedFolder]);

    const loadFolders = async () => {
        try {
            const response = await api.get("/documents/folders/tree");
            setFolders(response.data.folders || []);
        } catch (error) {
            console.error("Error loading folders:", error);
        }
    };

    const loadFolderDocuments = async (folderId: number) => {
        setLoading(true);
        try {
            const response = await api.get(`/documents/folders/${folderId}/files`);
            setDocuments(response.data.documents || []);
        } catch (error) {
            console.error("Error loading documents:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query: string) => {
        if (!query.trim()) {
            if (selectedFolder) {
                loadFolderDocuments(selectedFolder);
            }
            return;
        }

        setLoading(true);
        try {
            const response = await api.get(`/documents/search?q=${encodeURIComponent(query)}`);
            setDocuments(response.data.results || []);
        } catch (error) {
            console.error("Error searching:", error);
        } finally {
            setLoading(false);
        }
    };

    const getFileIcon = (type: string) => {
        switch (type) {
            case "pdf":
                return "📄";
            case "document":
                return "📝";
            case "image":
                return "🖼️";
            default:
                return "📎";
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const renderFolderTree = (nodes: FolderNode[], level = 0) => {
        return nodes.map((node) => (
            <div key={node.id} style={{ paddingLeft: `${level * 16}px` }}>
                <button
                    onClick={() => setSelectedFolder(node.id)}
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm rounded transition
            ${selectedFolder === node.id
                            ? "bg-blue-100 dark:bg-blue-900 font-medium"
                            : "hover:bg-gray-100 dark:hover:bg-gray-800"
                        }`}
                >
                    <span>📁</span>
                    <span className="flex-1 text-left">{node.name}</span>
                    {node.document_count > 0 && (
                        <span className="text-xs text-gray-500">{node.document_count}</span>
                    )}
                </button>
                {node.children && node.children.length > 0 && (
                    <div>{renderFolderTree(node.children, level + 1)}</div>
                )}
            </div>
        ));
    };

    return (
        <div className="flex h-screen">
            {/* Sidebar */}
            <div className="w-64 border-r bg-white dark:bg-gray-900">
                <div className="p-4 border-b">
                    <h2 className="font-semibold text-lg">📚 Документы</h2>
                </div>
                <div className="overflow-auto h-[calc(100vh-73px)] p-2">
                    {renderFolderTree(folders)}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Search */}
                <div className="p-4 border-b">
                    <input
                        type="text"
                        placeholder="🔍 Поиск документов..."
                        value={searchQuery}
                        onChange={(e) => {
                            setSearchQuery(e.target.value);
                            handleSearch(e.target.value);
                        }}
                        className="w-full px-4 py-2 border rounded dark:bg-gray-800"
                    />
                </div>

                {/* Documents */}
                <div className="flex-1 overflow-auto p-4">
                    {loading ? (
                        <p className="text-center text-gray-500">Загрузка...</p>
                    ) : documents.length === 0 ? (
                        <p className="text-center text-gray-500">
                            {selectedFolder
                                ? "В этой папке нет документов"
                                : "Выберите папку для просмотра документов"}
                        </p>
                    ) : (
                        <div className="grid gap-2">
                            {documents.map((doc) => (
                                <div
                                    key={doc.id}
                                    className="p-4 border rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="text-2xl">{getFileIcon(doc.document_type)}</span>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium truncate">{doc.original_filename}</p>
                                            <p className="text-sm text-gray-500">
                                                {formatFileSize(doc.file_size)} •{" "}
                                                {new Date(doc.created_at).toLocaleDateString("ru-RU")}
                                                {doc.is_indexed && (
                                                    <span className="ml-2 text-green-600">• ✓ Проиндексировано</span>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
