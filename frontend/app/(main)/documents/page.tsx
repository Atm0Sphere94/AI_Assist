"use client";

import { useState, useEffect } from "react";
import {
    File, Folder, Search, FileText, FileCode, Image as ImageIcon,
    Grid, List, Upload, Plus, Download, Trash2, MoreVertical,
    ChevronRight, Home
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { api } from "@/lib/api";
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
    const [searchQuery, setSearchQuery] = useState("");
    const [loading, setLoading] = useState(false);
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

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
            const response = await api.get("/api/documents/folders/tree");
            setFolders(response.data.folders || []);
            // Select root folder if available and nothing selected
            if (response.data.folders?.length > 0 && selectedFolder === null) {
                // Optional: Auto-select first folder? 
                // setSelectedFolder(response.data.folders[0].id);
            }
        } catch (error) {
            console.error("Error loading folders:", error);
        }
    };

    const loadFolderDocuments = async (folderId: number) => {
        setLoading(true);
        try {
            const response = await api.get(`/api/documents/folders/${folderId}/files`);
            setDocuments(response.data.documents || []);
        } catch (error) {
            console.error("Error loading documents:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async (query: string) => {
        setSearchQuery(query);
        if (!query.trim()) {
            if (selectedFolder) {
                loadFolderDocuments(selectedFolder);
            }
            return;
        }

        setLoading(true);
        try {
            const response = await api.get(`/api/documents/search?q=${encodeURIComponent(query)}`);
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
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    const renderFolderTree = (nodes: FolderNode[], level = 0) => {
        return nodes.map((node) => (
            <div key={node.id} style={{ paddingLeft: level === 0 ? 0 : '16px' }}>
                <button
                    onClick={() => setSelectedFolder(node.id)}
                    className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-md transition-colors mb-1",
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
                        <span className="text-xs bg-muted px-1.5 py-0.5 rounded-full">
                            {node.document_count}
                        </span>
                    )}
                </button>
                {node.children && node.children.length > 0 && (
                    <div className="border-l border-border/50 ml-3">
                        {renderFolderTree(node.children, level + 1)}
                    </div>
                )}
            </div>
        ));
    };

    return (
        <div className="flex h-screen bg-background">
            {/* Sidebar */}
            <div className="w-64 border-r border-border bg-card/50 flex flex-col">
                <div className="p-4 border-b border-border flex items-center gap-2">
                    <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                        <Folder className="w-5 h-5 text-primary" />
                    </div>
                    <span className="font-semibold">File Manager</span>
                </div>

                <div className="p-3">
                    <Button className="w-full justify-start gap-2" variant="outline">
                        <Plus className="w-4 h-4" />
                        New Folder
                    </Button>
                </div>

                <ScrollArea className="flex-1 px-3">
                    <div className="pb-4">
                        <div className="mb-2 px-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Folders
                        </div>
                        {renderFolderTree(folders)}
                    </div>
                </ScrollArea>

                <div className="p-4 border-t border-border">
                    <div className="bg-muted/50 rounded-lg p-3 text-xs text-muted-foreground">
                        <div className="flex justify-between mb-1">
                            <span>Storage</span>
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
                                placeholder="Search files..."
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
                                className={cn("h-7 w-7 p-0 rounded-md", viewMode === 'grid' && "bg-background shadow-sm")}
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className={cn("h-7 w-7 p-0 rounded-md", viewMode === 'list' && "bg-background shadow-sm")}
                                onClick={() => setViewMode('list')}
                            >
                                <List className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="h-6 w-px bg-border mx-2" />
                        <Button className="gap-2 shadow-lg shadow-primary/20">
                            <Upload className="w-4 h-4" />
                            Upload File
                        </Button>
                    </div>
                </div>

                {/* Toolbar / Breadcrumbs */}
                <div className="h-10 border-b border-border flex items-center px-6 bg-muted/20 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                        <Home className="w-4 h-4 hover:text-foreground cursor-pointer transition-colors" />
                        <ChevronRight className="w-4 h-4 text-border" />
                        {selectedFolder ? (
                            <span className="font-medium text-foreground">
                                {folders.find(f => f.id === selectedFolder)?.name || 'Projects'}
                            </span>
                        ) : (
                            <span>Select a folder</span>
                        )}
                    </div>
                </div>

                {/* Files Area */}
                <ScrollArea className="flex-1 bg-muted/10">
                    <div className="p-6">
                        {loading ? (
                            <div className="flex items-center justify-center h-64 text-muted-foreground animate-pulse">
                                Loading docs...
                            </div>
                        ) : documents.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-96 text-muted-foreground border-2 border-dashed border-border/50 rounded-xl bg-card/50">
                                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                                    <Folder className="w-8 h-8 opacity-20" />
                                </div>
                                <h3 className="font-medium text-lg mb-1">No files found</h3>
                                <p className="text-sm max-w-xs text-center mb-6">
                                    {selectedFolder ? "This folder is empty. Upload a file to get started." : "Select a folder from the sidebar to view files."}
                                </p>
                                {selectedFolder && (
                                    <Button variant="outline" className="gap-2">
                                        <Upload className="w-4 h-4" />
                                        Upload File
                                    </Button>
                                )}
                            </div>
                        ) : viewMode === 'grid' ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {documents.map((doc) => (
                                    <Card key={doc.id} className="group relative overflow-hidden transition-all hover:shadow-md hover:border-primary/50 cursor-pointer bg-card border-border/50">
                                        <div className="aspect-[4/3] bg-gradient-to-br from-muted/50 to-muted flex items-center justify-center relative group-hover:from-primary/5 group-hover:to-primary/10 transition-colors">
                                            {getFileIcon(doc.document_type)}
                                            {doc.is_indexed && (
                                                <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500 ring-2 ring-background" title="Indexed" />
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
                                                <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                                            </div>
                                        </div>
                                        {/* Hover Actions */}
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                            <Button size="icon" variant="secondary" className="h-7 w-7 rounded-sm shadow-sm backdrop-blur-sm bg-background/80 hover:bg-background">
                                                <Download className="w-3.5 h-3.5" />
                                            </Button>
                                            <Button size="icon" variant="secondary" className="h-7 w-7 rounded-sm shadow-sm backdrop-blur-sm bg-background/80 hover:bg-destructive hover:text-destructive-foreground">
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
                                            <th className="px-4 py-3 pl-6 w-12">Type</th>
                                            <th className="px-4 py-3">Name</th>
                                            <th className="px-4 py-3">Size</th>
                                            <th className="px-4 py-3">Date</th>
                                            <th className="px-4 py-3 text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {documents.map((doc) => (
                                            <tr key={doc.id} className="hover:bg-muted/30 transition-colors group">
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
                                                    {new Date(doc.created_at).toLocaleDateString()}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                        <MoreVertical className="w-4 h-4" />
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
                    <span>{documents.length} items selected</span>
                    <span>Last synced: Just now</span>
                </div>
            </div>
        </div>
    );
}
