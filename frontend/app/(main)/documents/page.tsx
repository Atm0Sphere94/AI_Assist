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

    // Beautiful Icon System based on Type
    const getFileVisuals = (type: string) => {
        switch (type) {
            case "pdf":
                return {
                    icon: <FileText className="w-8 h-8 text-rose-500" />,
                    bg: "bg-gradient-to-br from-rose-500/10 to-rose-500/5 group-hover:from-rose-500/20 group-hover:to-rose-500/10",
                    border: "group-hover:border-rose-500/30"
                };
            case "document":
                return {
                    icon: <FileCode className="w-8 h-8 text-blue-500" />,
                    bg: "bg-gradient-to-br from-blue-500/10 to-blue-500/5 group-hover:from-blue-500/20 group-hover:to-blue-500/10",
                    border: "group-hover:border-blue-500/30"
                };
            case "image":
                return {
                    icon: <ImageIcon className="w-8 h-8 text-emerald-500" />,
                    bg: "bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 group-hover:from-emerald-500/20 group-hover:to-emerald-500/10",
                    border: "group-hover:border-emerald-500/30"
                };
            default:
                return {
                    icon: <File className="w-8 h-8 text-slate-500" />,
                    bg: "bg-gradient-to-br from-slate-500/10 to-slate-500/5 group-hover:from-slate-500/20 group-hover:to-slate-500/10",
                    border: "group-hover:border-slate-500/30"
                };
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
                <div key={node.id} style={{ paddingLeft: level === 0 ? 0 : '14px' }}>
                    <div className="flex items-center mb-1 group/item">
                        {hasChildren ? (
                            <button
                                onClick={(e) => toggleFolderExpansion(node.id, e)}
                                className="w-5 flex justify-center text-muted-foreground/60 hover:text-foreground transition-colors"
                            >
                                {isExpanded ? (
                                    <ChevronDown className="w-3.5 h-3.5" />
                                ) : (
                                    <ChevronRight className="w-3.5 h-3.5" />
                                )}
                            </button>
                        ) : (
                            <span className="w-5" />
                        )}

                        <button
                            onClick={() => handleFolderClick(node.id)}
                            className={cn(
                                "flex-1 flex items-center gap-2.5 px-2.5 py-2 text-sm rounded-lg transition-all",
                                selectedFolder === node.id
                                    ? "bg-primary/10 text-primary font-medium shadow-sm shadow-primary/5 border border-primary/20"
                                    : "hover:bg-muted/50 text-muted-foreground hover:text-foreground border border-transparent"
                            )}
                        >
                            <Folder className={cn(
                                "w-4 h-4 transition-transform group-hover/item:scale-110",
                                selectedFolder === node.id ? "text-primary fill-primary/20" : "text-amber-500"
                            )} />
                            <span className="flex-1 text-left truncate">{node.name}</span>
                            {node.document_count > 0 && (
                                <span className={cn(
                                    "text-xs px-2 py-0.5 rounded-full font-medium shadow-sm",
                                    selectedFolder === node.id
                                        ? "bg-primary/20 text-primary"
                                        : "bg-muted text-muted-foreground/70 group-hover/item:bg-background"
                                )}>
                                    {node.document_count}
                                </span>
                            )}
                        </button>
                    </div>

                    {hasChildren && isExpanded && (
                        <div className="border-l border-border/40 ml-2.5 mt-1 mb-2">
                            {renderFolderTree(node.children, level + 1)}
                        </div>
                    )}
                </div>
            );
        });
    };

    return (
        <div className="flex h-screen bg-background/95 supports-[backdrop-filter]:bg-background/60">
            {/* Sidebar */}
            <div className="w-72 border-r border-border/40 bg-card/40 backdrop-blur-3xl flex flex-col z-20">
                <div className="h-16 border-b border-border/40 flex items-center gap-3 px-6 shadow-sm">
                    <div className="w-9 h-9 bg-gradient-to-tr from-primary/30 to-primary/10 rounded-xl flex items-center justify-center border border-primary/20 shadow-inner">
                        <Folder className="w-4 h-4 text-primary" />
                    </div>
                    <span className="font-bold text-lg tracking-tight">Документы</span>
                </div>

                <div className="p-4">
                    <Button className="w-full justify-start gap-2 h-10 shadow-sm border-dashed hover:border-solid hover:border-primary/50 transition-all font-medium" variant="outline">
                        <Plus className="w-4 h-4 text-primary" />
                        Новая папка
                    </Button>
                </div>

                <ScrollArea className="flex-1 px-4">
                    <div className="pb-6">
                        <div className="mb-3 px-2 text-xs font-bold text-muted-foreground/70 uppercase tracking-widest">
                            Папки
                        </div>
                        {renderFolderTree(folders)}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t border-border/40 bg-muted/10">
                    <div className="bg-card/50 backdrop-blur-sm border border-border/40 rounded-xl p-4 shadow-sm relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 via-purple-500/5 to-pink-500/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <div className="relative z-10">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-semibold text-foreground/80">Хранилище</span>
                                <span className="text-xs font-bold bg-muted px-2 py-0.5 rounded-full text-muted-foreground">75%</span>
                            </div>
                            <div className="h-2 w-full bg-muted/40 rounded-full overflow-hidden border border-border/50">
                                <div className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 w-3/4 rounded-full relative">
                                    <div className="absolute inset-0 bg-white/20 animate-pulse" />
                                </div>
                            </div>
                            <p className="text-[10px] text-muted-foreground mt-2 font-medium">15 ГБ использовано из 20 ГБ</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-w-0 bg-gradient-to-br from-background via-background to-muted/20 relative">
                {/* Header */}
                <div className="h-16 border-b border-border/40 flex items-center justify-between px-8 bg-card/60 backdrop-blur-2xl z-10 shadow-sm">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="relative w-[400px] max-w-full group/search">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/60 group-focus-within/search:text-primary transition-colors" />
                            <Input
                                placeholder="Поиск файлов или папок..."
                                className="pl-9 h-10 bg-muted/30 border-border/50 focus-visible:ring-primary/30 focus-visible:border-primary/50 transition-all rounded-xl shadow-inner text-sm font-medium"
                                value={searchQuery}
                                onChange={(e) => handleSearch(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <div className="flex bg-muted/40 p-1 rounded-lg border border-border/40 relative">
                            <Button
                                variant="ghost"
                                size="sm"
                                title="Сетка"
                                className={cn("h-7 w-8 p-0 rounded-md transition-all z-10 text-muted-foreground hover:text-foreground", viewMode === 'grid' && "text-foreground shadow-sm")}
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                title="Список"
                                className={cn("h-7 w-8 p-0 rounded-md transition-all z-10 text-muted-foreground hover:text-foreground", viewMode === 'list' && "text-foreground shadow-sm")}
                                onClick={() => setViewMode('list')}
                            >
                                <List className="w-4 h-4" />
                            </Button>
                            {/* Animated background pill for active state */}
                            <div
                                className={cn(
                                    "absolute top-1 bottom-1 w-8 bg-background shadow-sm border border-border/40 rounded-md transition-transform duration-300 ease-out z-0",
                                    viewMode === 'grid' ? "translate-x-0" : "translate-x-8"
                                )}
                            />
                        </div>
                        <div className="h-6 w-px bg-border/60" />
                        <Button className="h-9 gap-2 bg-gradient-to-b from-primary to-primary/80 hover:to-primary text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5 transition-all duration-300 rounded-xl font-medium px-5">
                            <Upload className="w-4 h-4" />
                            Загрузить
                        </Button>
                    </div>
                </div>

                {/* Breadcrumbs */}
                <div className="h-12 border-b border-border/40 flex items-center px-8 bg-muted/10 text-sm backdrop-blur-md z-0">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                        {selectedFolder && (
                            <Button variant="ghost" size="icon" className="h-6 w-6 mr-1 rounded-md hover:bg-muted/60" onClick={handleNavigateUp}>
                                <ArrowLeft className="w-3.5 h-3.5" />
                            </Button>
                        )}
                        <button
                            className="p-1 hover:bg-muted/50 rounded-md text-muted-foreground hover:text-foreground transition-colors"
                            onClick={() => setSelectedFolder(null)}
                        >
                            <Home className="w-4 h-4" />
                        </button>
                        <ChevronRight className="w-3.5 h-3.5 text-border opacity-60" />
                        {selectedFolder ? (
                            <span className="font-semibold text-foreground/90 px-2 py-1 bg-background rounded-md shadow-sm border border-border/40">
                                {findFolderById(folders, selectedFolder)?.name || '...'}
                            </span>
                        ) : (
                            <span className="font-medium px-2 py-1">Корневая папка</span>
                        )}
                    </div>
                </div>

                {/* Files Area */}
                <ScrollArea className="flex-1">
                    <div className="p-8">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground animate-pulse gap-4">
                                <div className="w-10 h-10 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                <span className="font-medium text-sm">Загрузка данных...</span>
                            </div>
                        ) : documents.length === 0 && currentSubfolders.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-[28rem] text-muted-foreground mt-4 relative">
                                {/* Decorative elements behind the empty state */}
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                    <div className="w-64 h-64 bg-primary/5 rounded-full blur-3xl" />
                                    <div className="w-48 h-48 bg-amber-500/5 rounded-full blur-2xl absolute -ml-20 -mt-10" />
                                </div>
                                <div className="relative w-24 h-24 mb-6 group">
                                    <div className="absolute inset-0 bg-primary/10 rounded-3xl blur-xl transition-all duration-500 group-hover:bg-primary/20 group-hover:blur-2xl" />
                                    <div className="relative flex items-center justify-center w-full h-full bg-card border border-border/50 rounded-3xl shadow-xl shadow-primary/5 transition-transform duration-500 group-hover:scale-105">
                                        <Folder className="w-10 h-10 text-muted-foreground/40" />
                                    </div>
                                </div>
                                <h3 className="font-bold text-xl mb-2 text-foreground/90 tracking-tight">Папка пуста</h3>
                                <p className="text-sm max-w-sm text-center mb-8 text-muted-foreground/80 leading-relaxed">
                                    {selectedFolder ? "В этой папке пока нет файлов." : "Выберите папку слева или создайте новую."}
                                    <br />Перетащите файлы сюда или нажмите кнопку ниже.
                                </p>
                                {selectedFolder && (
                                    <Button className="gap-2 h-10 px-6 rounded-xl shadow-md" variant="secondary">
                                        <Upload className="w-4 h-4" />
                                        Загрузить файл
                                    </Button>
                                )}
                            </div>
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-6">
                                {/* Render Subfolders */}
                                {currentSubfolders.map((folder) => (
                                    <Card
                                        key={`folder-${folder.id}`}
                                        className="group relative overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl hover:shadow-primary/5 hover:border-amber-500/30 cursor-pointer bg-card/60 backdrop-blur-sm border-border/40 rounded-xl"
                                        onClick={() => handleFolderClick(folder.id)}
                                        onDoubleClick={() => handleFolderClick(folder.id)}
                                    >
                                        <div className="aspect-[4/3] bg-gradient-to-br from-amber-500/10 to-amber-500/5 flex items-center justify-center group-hover:from-amber-500/20 group-hover:to-amber-500/10 transition-colors">
                                            <Folder className="w-14 h-14 text-amber-500 fill-amber-500/20 group-hover:scale-110 transition-transform duration-300" />
                                        </div>
                                        <div className="p-4 bg-card/50">
                                            <div className="flex items-start justify-between gap-2 mb-1">
                                                <p className="font-semibold text-sm truncate w-full tracking-tight" title={folder.name}>
                                                    {folder.name}
                                                </p>
                                            </div>
                                            <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                                                <span>Папка</span>
                                                <span className="bg-muted px-2 py-0.5 rounded-full">{folder.document_count}</span>
                                            </div>
                                        </div>
                                        {/* Hover Actions for Folder */}
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                            <Button
                                                size="icon"
                                                variant="secondary"
                                                className="h-8 w-8 rounded-lg shadow-sm border border-border/50 backdrop-blur-md bg-background/80 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive/30 transition-all text-muted-foreground"
                                                title="Удалить папку"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteFolder(folder.id);
                                                }}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </Card>
                                ))}

                                {/* Render Documents */}
                                {documents.map((doc) => {
                                    const visual = getFileVisuals(doc.document_type);
                                    return (
                                        <Card
                                            key={`doc-${doc.id}`}
                                            className={cn(
                                                "group relative overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:shadow-xl cursor-pointer bg-card/60 backdrop-blur-sm border-border/40 rounded-xl",
                                                visual.border
                                            )}
                                        >
                                            <div className={cn("aspect-[4/3] flex items-center justify-center relative transition-colors", visual.bg)}>
                                                <div className="group-hover:scale-110 transition-transform duration-300">
                                                    {visual.icon}
                                                </div>
                                                {doc.is_indexed && (
                                                    <div className="absolute top-3 left-3 w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] ring-2 ring-background/50" title="Проиндексировано" />
                                                )}
                                            </div>
                                            <div className="p-4 bg-card/50">
                                                <div className="flex items-start justify-between gap-2 mb-1.5">
                                                    <p className="font-semibold text-sm truncate w-full tracking-tight" title={doc.original_filename}>
                                                        {doc.original_filename}
                                                    </p>
                                                </div>
                                                <div className="flex items-center justify-between text-xs text-muted-foreground font-medium">
                                                    <span>{formatFileSize(doc.file_size)}</span>
                                                    <span>{new Date(doc.created_at).toLocaleDateString("ru-RU", { day: 'numeric', month: 'short' })}</span>
                                                </div>
                                            </div>
                                            {/* Hover Actions */}
                                            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1.5">
                                                <Button size="icon" variant="secondary" className="h-8 w-8 rounded-lg shadow-sm border border-border/50 backdrop-blur-md bg-background/80 hover:bg-background hover:text-primary transition-all text-muted-foreground" title="Скачать">
                                                    <Download className="w-4 h-4" />
                                                </Button>
                                                <Button
                                                    size="icon"
                                                    variant="secondary"
                                                    className="h-8 w-8 rounded-lg shadow-sm border border-border/50 backdrop-blur-md bg-background/80 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive/30 transition-all text-muted-foreground"
                                                    title="Удалить"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleDeleteDocument(doc.id);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        </Card>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="rounded-xl border border-border/40 bg-card/50 backdrop-blur-md overflow-hidden shadow-sm">
                                <table className="w-full text-sm text-left border-collapse">
                                    <thead className="text-xs text-muted-foreground bg-muted/30 uppercase font-semibold">
                                        <tr>
                                            <th className="px-6 py-4 w-14"></th>
                                            <th className="px-4 py-4">Имя</th>
                                            <th className="px-4 py-4 w-32">Размер</th>
                                            <th className="px-4 py-4 w-40">Дата загрузки</th>
                                            <th className="px-6 py-4 text-right w-24">Действия</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/30">
                                        {/* Render Subfolders List */}
                                        {currentSubfolders.map((folder) => (
                                            <tr
                                                key={`folder-${folder.id}`}
                                                className="hover:bg-muted/40 transition-colors group cursor-pointer"
                                                onClick={() => handleFolderClick(folder.id)}
                                            >
                                                <td className="px-6 py-4">
                                                    <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
                                                        <Folder className="w-5 h-5 text-amber-500 fill-amber-500/20" />
                                                    </div>
                                                </td>
                                                <td className="px-4 py-4 font-semibold text-foreground tracking-tight">
                                                    {folder.name}
                                                </td>
                                                <td className="px-4 py-4 text-muted-foreground font-medium">
                                                    {folder.document_count > 0 ? `${folder.document_count} элем.` : 'Пусто'}
                                                </td>
                                                <td className="px-4 py-4 text-muted-foreground font-medium">
                                                    -
                                                </td>
                                                <td className="px-6 py-4 text-right">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-foreground rounded-lg"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleFolderClick(folder.id);
                                                            }}
                                                        >
                                                            <ChevronRight className="w-4 h-4" />
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                                            title="Удалить папку"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleDeleteFolder(folder.id);
                                                            }}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}

                                        {/* Render Documents List */}
                                        {documents.map((doc) => {
                                            const visual = getFileVisuals(doc.document_type);
                                            return (
                                                <tr key={`doc-${doc.id}`} className="hover:bg-muted/40 transition-colors group">
                                                    <td className="px-6 py-4">
                                                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", visual.bg.split(' ')[0])}>
                                                            {visual.icon}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-4">
                                                        <span className="font-semibold text-foreground tracking-tight flex items-center gap-2">
                                                            {doc.original_filename}
                                                            {doc.is_indexed && (
                                                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" title="Проиндексировано" />
                                                            )}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-4 text-muted-foreground font-medium">
                                                        {formatFileSize(doc.file_size)}
                                                    </td>
                                                    <td className="px-4 py-4 text-muted-foreground font-medium">
                                                        {new Date(doc.created_at).toLocaleDateString("ru-RU", { day: 'numeric', month: 'short', year: 'numeric' })}
                                                    </td>
                                                    <td className="px-6 py-4 text-right">
                                                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg"
                                                                title="Скачать"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </Button>
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg"
                                                                title="Удалить"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleDeleteDocument(doc.id);
                                                                }}
                                                            >
                                                                <Trash2 className="w-4 h-4" />
                                                            </Button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </ScrollArea>

                {/* Status Bar */}
                <div className="h-8 border-t border-border/40 bg-card/40 backdrop-blur-md flex items-center px-6 text-xs text-muted-foreground justify-between font-medium z-10">
                    <span className="flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                        {documents.length + currentSubfolders.length} элементов
                    </span>
                    <span>Синхронизировано • Последнее обновление только что</span>
                </div>
            </div>
        </div>
    );
}
