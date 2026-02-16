"use client";

import { useState, useEffect } from "react";
import { File, Folder, Search, FileText, FileCode, Image } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
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

    // Load folder tree
    useEffect(() => {
        loadFolders();
    }, []);

    // Load documents when folder selected
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
                return <FileText className="w-5 h-5 text-red-500" />;
            case "document":
                return <FileCode className="w-5 h-5 text-blue-500" />;
            case "image":
                return <Image className="w-5 h-5 text-green-500" />;
            default:
                return <File className="w-5 h-5 text-gray-500" />;
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
                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent rounded-md transition-colors ${selectedFolder === node.id ? "bg-accent font-medium" : ""
                        }`}
                >
                    <Folder className="w-4 h-4 text-amber-500" />
                    <span className="flex-1 text-left">{node.name}</span>
                    {node.document_count > 0 && (
                        <span className="text-xs text-muted-foreground">
                            {node.document_count}
                        </span>
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
            {/* Sidebar - Folder Tree */}
            <div className="w-64 border-r border-border bg-card">
                <div className="p-4 border-b border-border">
                    <h2 className="font-semibold text-lg">Документы</h2>
                </div>
                <ScrollArea className="h-[calc(100vh-73px)]">
                    <div className="p-2">{renderFolderTree(folders)}</div>
                </ScrollArea>
            </div>

            {/* Main Content - Document List */}
            <div className="flex-1 flex flex-col">
                {/* Search Bar */}
                <div className="p-4 border-b border-border">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            type="text"
                            placeholder="Поиск документов..."
                            value={searchQuery}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                handleSearch(e.target.value);
                            }}
                            className="pl-10"
                        />
                    </div>
                </div>

                {/* Document List */}
                <ScrollArea className="flex-1">
                    <div className="p-4">
                        {loading ? (
                            <p className="text-center text-muted-foreground">Загрузка...</p>
                        ) : documents.length === 0 ? (
                            <p className="text-center text-muted-foreground">
                                {selectedFolder
                                    ? "В этой папке нет документов"
                                    : "Выберите папку для просмотра документов"}
                            </p>
                        ) : (
                            <div className="grid gap-2">
                                {documents.map((doc) => (
                                    <Card
                                        key={doc.id}
                                        className="p-4 hover:bg-accent transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            {getFileIcon(doc.document_type)}
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium truncate">
                                                    {doc.original_filename}
                                                </p>
                                                <p className="text-sm text-muted-foreground">
                                                    {formatFileSize(doc.file_size)} •{" "}
                                                    {new Date(doc.created_at).toLocaleDateString("ru-RU")}
                                                    {doc.is_indexed && (
                                                        <span className="ml-2 text-green-600">
                                                            • Проиндексировано
                                                        </span>
                                                    )}
                                                </p>
                                            </div>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
