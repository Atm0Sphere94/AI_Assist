"use client";

import { useState, useEffect } from "react";
import {
    File, Folder, Search, FileText, FileCode, Image as ImageIcon,
    Grid, List, Upload, Plus, Download, Trash2, MoreVertical,
    ChevronRight, ChevronDown, Home, ArrowLeft
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api, documentsApi } from "@/lib/api";
import { cn } from "@/lib/utils";

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
    const [currentSubfolders, setCurrentSubfolders] = useState<FolderNode[]>([]);
    const [expandedFolders, setExpandedFolders] = useState<Set<number>>(new Set());
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

    // Load folder tree
    useEffect(() => {
        loadFolders();
    }, []);

    // Load documents and subfolders when folder selected
    useEffect(() => {
        if (selectedFolder !== null) {
            loadFolderContent(selectedFolder);
            // Auto-expand the selected folder in the tree
            setExpandedFolders(prev => {
                const newSet = new Set(prev);
                newSet.add(selectedFolder);
                return newSet;
            });
        } else {
            // Root view
            setDocuments([]);
            // Find root folders (null parent)
            const rootFolders = folders.filter(f => f.parent_id === null);
            setCurrentSubfolders(rootFolders);
        }
    }, [selectedFolder, folders]);

    const loadFolders = async () => {
        try {
            const response = await api.get("/api/documents/folders/tree");
            setFolders(response.data.folders || []);
        } catch (error) {
            console.error("Ошибка при загрузке папок:", error);
        }
    };

    const findFolderById = (nodes: FolderNode[], id: number): FolderNode | null => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findFolderById(node.children, id);
                if (found) return found;
            }
        }
        return null;
    };

    const loadFolderContent = async (folderId: number) => {
        setLoading(true);
        try {
            // Get files
            const response = await api.get(`/api/documents/folders/${folderId}/files`);
            setDocuments(response.data.documents || []);

            // Get subfolders from already loaded tree
            const currentFolder = findFolderById(folders, folderId);
            setCurrentSubfolders(currentFolder?.children || []);

        } catch (error) {
            console.error("Ошибка при загрузке документов:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            if (selectedFolder) {
                loadFolderContent(selectedFolder);
            } else {
                setDocuments([]);
                setCurrentSubfolders(folders.filter(f => f.parent_id === null));
            }
            return;
        }

        setLoading(true);
        try {
            const response = await api.get(`/api/documents/search?q=${encodeURIComponent(query)}`);
            setDocuments(response.data.results || []);
            setCurrentSubfolders([]); // Search results don't show folders typically
        } catch (error) {
            console.error("Ошибка поиска:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleFolderClick = (folderId: number) => {
        if (selectedFolder === folderId) {
            // Toggle expansion if clicking already selected folder
            toggleFolderExpansion(folderId);
        } else {
            setSelectedFolder(folderId);
            setSearchQuery("");
        }
    };

    const toggleFolderExpansion = (folderId: number, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setExpandedFolders(prev => {
            const newSet = new Set(prev);
            if (newSet.has(folderId)) {
                newSet.delete(folderId);
            } else {
                newSet.add(folderId);
            }
            return newSet;
        });
    };

    const handleDeleteDocument = async (id: number) => {
        if (!confirm("Вы уверены, что хотите удалить этот документ?")) return;
        try {
            await documentsApi.delete(id);
            if (selectedFolder) {
                loadFolderContent(selectedFolder);
            } else {
                const docs = await documentsApi.list(undefined, false);
                setDocuments(docs);
            }
        } catch (error) {
            console.error("Failed to delete document:", error);
            alert("Не удалось удалить документ");
        }
    };

    const handleDeleteFolder = async (id: number) => {
        if (!confirm("Вы уверены, что хотите удалить эту папку и все её содержимое?")) return;
        try {
            await documentsApi.deleteFolder(id);
            await loadFolders(); // Refresh tree
            if (selectedFolder === id) {
                setSelectedFolder(null);
            } else if (selectedFolder) {
                loadFolderContent(selectedFolder);
            }
        } catch (error) {
            console.error("Failed to delete folder:", error);
            alert("Не удалось удалить папку");
        }
    };

    const handleNavigateUp = () => {
        if (selectedFolder === null) return;
        const current = findFolderById(folders, selectedFolder);
        setSelectedFolder(current?.parent_id || null);
    };

    const getFileIcon = (type: string) => {
        switch (type) {
            case "pdf":
                return <FileText className="w-8 h-8 text-red-500" />;
            case "document":
                return <FileCode className="w-8 h-8 text-blue-500" />;
            case "image":
                return <ImageIcon className="w-8 h-8 text-green-500" />;
            default:
                return <File className="w-8 h-8 text-gray-500" />;
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " Б";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " КБ";
        return (bytes / (1024 * 1024)).toFixed(1) + " МБ";
    };

    const renderFolderTree = (nodes: FolderNode[], level = 0) => {
        return nodes.map((node) => {
            const isExpanded = expandedFolders.has(node.id);
            const hasChildren = node.children && node.children.length > 0;

            return (
                <div key={node.id} style={{ paddingLeft: level === 0 ? 0 : '12px' }}>
                    <div className="flex items-center gap-1 mb-1">
                        {hasChildren ? (
                            <button
                                onClick={(e) => toggleFolderExpansion(node.id, e)}
                                className="p-0.5 hover:bg-muted rounded text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="w-4 h-4" />
                                ) : (
                                    <ChevronRight className="w-4 h-4" />
                                )}
                            </button>
                        ) : (
                            <span className="w-5" />
                        )}

                        <button
                            onClick={() => handleFolderClick(node.id)}
                            className={cn(
                                "flex-1 flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors",
                                selectedFolder === node.id
                                    ? "bg-primary/10 text-primary font-medium"
                                    : "hover:bg-muted text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <Folder className={cn(
                                "w-4 h-4",
                                selectedFolder === node.id ? "text-primary fill-primary/20" : "text-amber-500"
                            )} />
                            <span className="flex-1 text-left truncate">{node.name}</span>
                            {node.document_count > 0 && (
                                <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full text-muted-foreground/70">
                                    {node.document_count}
                                </span>
                            )}
                        </button>
                    </div>

                    {hasChildren && isExpanded && (
                        <div className="border-l border-border/40 ml-2.5">
                            {renderFolderTree(node.children, level + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <div className="w-64 border-r border-border bg-card/50 flex flex-col">
                <div className="p-4 border-b border-border flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Folder className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-semibold">Файлы</span>
                </div>

                <div className="p-3">
                    <Button className="w-full justify-start gap-2" variant="outline">
                        <Plus className="w-4 h-4" />
                        Новая папка
                    </Button>
                </div>

                <ScrollArea className="flex-1 px-3">
                    <div className="pb-4">
                        <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Папки
                        </div>
                        {renderFolderTree(folders)}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t border-border">
                    <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                        <div className="flex justify-between mb-1">
                            <span>Хранилище</span>
                            <span>75%</span>
                        </div>
                        <div className="h-1.5 bg-border rounded-full overflow-hidden">
                            <div className="h-full bg-primary w-3/4" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="h-16 border-b border-border flex items-center justify-between px-6 bg-card/50 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative w-96 max-w-full">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Поиск файлов..."
                                className="pl-9 bg-background/50 border-input/50 focus:bg-background transition-all"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <div className="flex bg-muted p-1 rounded-lg border border-border">
                            <Button
                                variant="ghost"
                                size="sm"
                                title="Сетка"
                                className={cn("h-7 w-7 p-0 rounded-md", viewMode === 'grid' && "bg-background shadow-sm")}
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                title="Список"
                                className={cn("h-7 w-7 p-0 rounded-md", viewMode === 'list' && "bg-background shadow-sm")}
                                onClick={() => setViewMode('list')}
                            >
                                <List className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="h-6 w-px bg-border mx-2" />
                        <Button className="gap-2 shadow-lg shadow-primary/20">
                            <Upload className="w-4 h-4" />
                            Загрузить
                        </Button>
                    </div>
                </div>

                {/* Toolbar / Breadcrumbs */}
                <div className="h-10 border-b border-border flex items-center px-6 bg-muted/20 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        {selectedFolder && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 mr-1" onClick={handleNavigateUp}>
                                <ArrowLeft className="w-4 h-4" />
                            </Button>
                        )}
                        <Home
                            className="w-4 h-4 hover:text-foreground cursor-pointer transition-colors"
                            onClick={() => setSelectedFolder(null)}
                        />
                        <ChevronRight className="w-4 h-4 text-border" />
                        {selectedFolder ? (
                            <span className="font-medium text-foreground">
                                {findFolderById(folders, selectedFolder)?.name || '...'}
                            </span>
                        ) : (
                            <span>Корневая папка</span>
                        )}
                    </div>
                </div>

                {/* Files Area */}
                <ScrollArea className="flex-1 bg-muted/10">
                    <div className="p-6">
                        {loading ? (
                            <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">
                                Загрузка...
                            </div>
                        ) : documents.length === 0 && currentSubfolders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-card/50">
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                    <Folder className="w-8 h-8 opacity-20" />
                                </div>
                                <h3 className="font-medium text-lg mb-1">Папка пуста</h3>
                                <p className="text-sm max-w-xs text-center mb-6">
                                    {selectedFolder ? "В этой папке нет файлов. Загрузите что-нибудь." : "Выберите папку слева или создайте новую."}
                                </p>
                                {selectedFolder && (
                                    <Button variant="outline" className="gap-2">
                                        <Upload className="w-4 h-4" />
                                        Загрузить файл
                                    </Button>
                                )}
                            </div>
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {/* Render Subfolders */}
                                {currentSubfolders.map((folder) => (
                                    <Card
                                        key={`folder-${folder.id}`}
                                        className="group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/50 cursor-pointer bg-card border-border/50"
                                        onClick={() => handleFolderClick(folder.id)}
                                        onDoubleClick={() => handleFolderClick(folder.id)}
                                    >
                                        <div className="aspect-[4/3] bg-amber-500/5 flex items-center justify-center group-hover:bg-amber-500/10 transition-colors">
                                            <Folder className="w-12 h-12 text-amber-500 fill-amber-500/20" />
                                        </div>
                                        <div className="p-3">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <p className="font-medium text-sm truncate w-full" title={folder.name}>
                                                    {folder.name}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>Папка</span>
                                                <span>{folder.document_count} файлов</span>
                                            </div>
                                        </div>
                                        {/* Hover Actions for Folder */}
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                className="h-7 w-7 rounded-sm shadow-sm backdrop-blur-sm bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                                                title="Удалить папку"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteFolder(folder.id);
                                                }}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </Card>
                                ))}

                                {/* Render Documents */}
                                {documents.map((doc) => (
                                    <Card key={`doc-${doc.id}`} className="group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/50 cursor-pointer bg-card border-border/50">
                                        <div className="aspect-[4/3] bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center relative group-hover:from-primary/5 group-hover:to-primary/10 transition-colors">
                                            {getFileIcon(doc.document_type)}
                                            {doc.is_indexed && (
                                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500 ring-2 ring-background" title="Проиндексировано" />
                                            )}
                                        </div>
                                        <div className="p-3">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <p className="font-medium text-sm truncate w-full" title={doc.original_filename}>
                                                    {doc.original_filename}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                <span>{formatFileSize(doc.file_size)}</span>
                                                <span>{new Date(doc.created_at).toLocaleDateString("ru-RU")}</span>
                                            </div>
                                        </div>
                                        {/* Hover Actions */}
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                            <Button size="icon" variant="secondary" className="h-7 w-7 rounded-sm shadow-sm backdrop-blur-sm bg-background/80 hover:bg-background" title="Скачать">
                                                <Download className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                className="h-7 w-7 rounded-sm shadow-sm backdrop-blur-sm bg-background/80 hover:bg-destructive hover:text-destructive-foreground"
                                                title="Удалить"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteDocument(doc.id);
                                                }}
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </Button>
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        ) : (
                            <Card className="overflow-hidden border-border/50 bg-card">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-muted-foreground bg-muted/50 uppercase font-medium">
                                        <tr>
                                            <th className="px-4 py-3 pl-6 w-12">Тип</th>
                                            <th className="px-4 py-3">Имя</th>
                                            <th className="px-4 py-3">Размер</th>
                                            <th className="px-4 py-3">Дата</th>
                                            <th className="px-4 py-3 text-right">Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {/* Render Subfolders List */}
                                        {currentSubfolders.map((folder) => (
                                            <tr
                                                key={`folder-${folder.id}`}
                                                className="hover:bg-muted/30 transition-colors group cursor-pointer"
                                                onClick={() => handleFolderClick(folder.id)}
                                            >
                                                <td className="px-4 py-3 pl-6">
                                                    <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                                                </td>
                                                <td className="px-4 py-3 font-medium text-foreground">
                                                    {folder.name}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    -
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    -
                                                </td>
                                                <td className="px-4 py-3 text-right flex justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            // Navigate to folder
                                                            handleFolderClick(folder.id);
                                                        }}
                                                    >
                                                        <ChevronRight className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        title="Удалить папку"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteFolder(folder.id);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}

                                        {/* Render Documents List */}
                                        {documents.map((doc) => (
                                            <tr key={`doc-${doc.id}`} className="hover:bg-muted/30 transition-colors group">
                                                <td className="px-4 py-3 pl-6">
                                                    {getFileIcon(doc.document_type)}
                                                </td>
                                                <td className="px-4 py-3 font-medium text-foreground">
                                                    {doc.original_filename}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {formatFileSize(doc.file_size)}
                                                </td>
                                                <td className="px-4 py-3 text-muted-foreground">
                                                    {new Date(doc.created_at).toLocaleDateString("ru-RU")}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                        title="Удалить"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteDocument(doc.id);
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </Card>
                        )}
                    </div>
                </ScrollArea>

                {/* Status Bar */}
                <div className="h-8 border-t border-border bg-card flex items-center px-4 text-xs text-muted-foreground justify-between">
                    <span>{documents.length + currentSubfolders.length} элементов</span>
                    <span>Синхронизировано</span>
                </div>
            </div>
        </div>
    );
}
