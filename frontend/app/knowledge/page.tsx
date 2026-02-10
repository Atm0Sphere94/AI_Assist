"use client";

import { useState } from "react";
import { knowledgeApi } from "@/lib/api";

type SearchResult = {
    text: string;
    score: number;
    document_id: number;
    filename: string;
};

export default function KnowledgePage() {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<SearchResult[]>([]);
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);

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

    return (
        <div className="max-w-4xl mx-auto p-6">
            <h1 className="text-3xl font-bold mb-8 text-gray-800 dark:text-white">База знаний</h1>

            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 mb-8">
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

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
                </div>
            ) : searched && results.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p className="text-lg">Ничего не найдено 🤷‍♂️</p>
                    <p className="text-sm mt-2">Попробуйте изменить запрос или загрузить больше документов.</p>
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
    );
}
