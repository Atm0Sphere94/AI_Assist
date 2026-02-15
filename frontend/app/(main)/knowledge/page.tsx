"use client";

import { useState, useEffect } from "react";
import { knowledgeApi, documentsApi } from "@/lib/api";
import { Trash2, RefreshCw, FileText, CheckCircle, XCircle } from "lucide-react";

type SearchResult = {
    text: string;
    score: number;
    document_id: number;
    filename: string;
};

type Document = {
    id: number;
    filename: string;
    created_at: string;
    is_indexed: boolean;
};

export default function KnowledgePage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

    const [documents, setDocuments] = useState<Document[]>([]);
    const [loadingDocs, setLoadingDocs] = useState(true);

    const fetchDocuments = async () => {
        try {
            setLoadingDocs(true);
            const data = await documentsApi.list();
            setDocuments(data);
        } catch (error) {
            console.error("Failed to fetch documents:", error);
        } finally {
            setLoadingDocs(false);
        }
    };

    useEffect(() => {
        fetchDocuments();
    }, []);

    const handleSearch = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!query.trim()) return;

        try {
            setLoading(true);
            setSearched(true);
            const data = await knowledgeApi.search(query);
            setResults(data);
        } catch (error) {
            console.error("Failed to search knowledge base:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("Вы уверены, что хотите удалить этот документ? Он также будет удален из индекса поиска.")) return;
        try {
            await documentsApi.delete(id);
            setDocuments(documents.filter(doc => doc.id !== id));
        } catch (error) {
            console.error("Failed to delete document:", error);
            alert("Ошибка при удалении документа");
        }
    };

    const handleIndex = async (id: number) => {
        try {
            await knowledgeApi.index(id);
            alert("Индексация запущена. Это может занять некоторое время.");
            fetchDocuments(); // Refresh status (though it might handle internally)
        } catch (error) {
            console.error("Failed to index document:", error);
            alert("Ошибка при запуске индексации");
        }
    };

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">База знаний</h1>

            {/* Search Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
                <h2 className="text-xl font-semibold mb-4 text-gray-700 dark:text-gray-200">Поиск по базе</h2>
                <form onSubmit={handleSearch} className="flex gap-4">
                    <input
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Что вы хотите найти?"
                        className="flex-1 px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white text-lg"
                    />
                    <button
                        type="submit"
                        disabled={loading || !query.trim()}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 text-lg"
                    >
                        {loading ? "Поиск..." : "Найти"}
                    </button>
                </form>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-3 ml-1">
                    Поиск выполняется по всем индексированным документам и сохраненным диалогам.
                </p>
            </div>

            {/* Search Results */}
            {searched && (
                <div className="mb-12">
                    <h3 className="text-lg font-semibold mb-4 text-gray-600 dark:text-gray-300">
                        Результаты поиска
                    </h3>
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                        </div>
                    ) : results.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/50 rounded-xl">
                            <p className="text-gray-500 dark:text-gray-400">Ничего не найдено 🤷‍♂️</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {results.map((result, index) => (
                                <div key={index} className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-xs font-semibold px-2 py-1 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 rounded-md">
                                            📄 {result.filename}
                                        </span>
                                        <span className="text-xs text-gray-400">
                                            {(result.score * 100).toFixed(0)}% совпадения
                                        </span>
                                    </div>
                                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                                        {result.text}
                                    </p>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Documents Management Section */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-semibold text-gray-700 dark:text-gray-200">Управление документами</h2>
                    <button
                        onClick={fetchDocuments}
                        className="p-2 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        title="Обновить список"
                    >
                        <RefreshCw size={20} className={loadingDocs ? "animate-spin" : ""} />
                    </button>
                </div>

                {loadingDocs ? (
                    <div className="text-center py-8 text-gray-500">Загрузка документов...</div>
                ) : documents.length === 0 ? (
                    <div className="text-center py-8 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-700/30 rounded-lg">
                        <FileText size={48} className="mx-auto mb-3 opacity-20" />
                        <p>Нет загруженных документов</p>
                        <p className="text-sm mt-1">Перейдите в раздел "Документы" чтобы загрузить файлы</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-gray-50 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300 uppercase tracking-wider font-medium">
                                <tr>
                                    <th className="px-4 py-3 rounded-tl-lg">Имя файла</th>
                                    <th className="px-4 py-3">Дата загрузки</th>
                                    <th className="px-4 py-3">Статус индекса</th>
                                    <th className="px-4 py-3 rounded-tr-lg text-right">Действия</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                                {documents.map((doc) => (
                                    <tr key={doc.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-4 py-3 font-medium text-gray-800 dark:text-gray-200">
                                            <div className="flex items-center gap-2">
                                                <FileText size={16} className="text-blue-500" />
                                                {doc.filename}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                                            {new Date(doc.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-4 py-3">
                                            {doc.is_indexed ? (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                                                    <CheckCircle size={12} />
                                                    В индексе
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                                                    <XCircle size={12} />
                                                    Не индексирован
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <div className="flex justify-end gap-2">
                                                {!doc.is_indexed && (
                                                    <button
                                                        onClick={() => handleIndex(doc.id)}
                                                        className="p-1.5 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/20 rounded-md transition-colors"
                                                        title="Индексировать"
                                                    >
                                                        <RefreshCw size={18} />
                                                    </button>
                                                )}
                                                <button
                                                    onClick={() => handleDelete(doc.id)}
                                                    className="p-1.5 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 rounded-md transition-colors"
                                                    title="Удалить"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
