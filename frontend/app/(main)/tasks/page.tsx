"use client";

import { useState, useEffect } from "react";
import { tasksApi } from "@/lib/api";

type Task = {
    id: number;
    title: string;
    description?: string;
    priority: "low" | "medium" | "high";
    status: "pending" | "in_progress" | "completed" | "cancelled";
    due_date?: string;
    created_at: string;
};

export default function TasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newTask, setNewTask] = useState({ title: "", description: "", priority: "medium" });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const data = await tasksApi.list();
            setTasks(data);
        } catch (error) {
            console.error("Failed to fetch tasks:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const created = await tasksApi.create(newTask);
            setTasks([created, ...tasks]);
            setShowModal(false);
            setNewTask({ title: "", description: "", priority: "medium" });
        } catch (error) {
            console.error("Failed to create task:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteTask = async (id: number) => {
        if (!confirm("Вы уверены?")) return;
        try {
            await tasksApi.delete(id);
            setTasks(tasks.filter(t => t.id !== id));
        } catch (error) {
            console.error("Failed to delete task:", error);
        }
    };

    const toggleStatus = async (task: Task) => {
        const newStatus = task.status === "completed" ? "pending" : "completed";
        try {
            const updated = await tasksApi.update(task.id, { status: newStatus });
            setTasks(tasks.map(t => t.id === task.id ? updated : t));
        } catch (error) {
            console.error("Failed to update status:", error);
        }
    };

    const priorityColor = (p: string) => {
        switch (p) {
            case "high": return "text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400";
            case "medium": return "text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400";
            case "low": return "text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400";
            default: return "text-gray-600 bg-gray-100";
        }
    };

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Задачи</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                    <span>+</span> Новая задача
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                </div>
            ) : tasks.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                    <p className="text-lg">Нет активных задач</p>
                    <p className="text-sm mt-2">Создайте первую задачу, чтобы начать планирование</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 gap-4">
                    {tasks.map((task) => (
                        <div
                            key={task.id}
                            className={`group bg-white dark:bg-gray-800 p-5 rounded-xl shadow-sm border border-transparent hover:border-blue-200 dark:hover:border-blue-800 transition-all ${task.status === 'completed' ? 'opacity-60' : ''}`}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex items-start gap-4">
                                    <button
                                        onClick={() => toggleStatus(task)}
                                        className={`mt-1 w-5 h-5 rounded border flex items-center justify-center transition-colors ${task.status === 'completed'
                                                ? 'bg-green-500 border-green-500 text-white'
                                                : 'border-gray-300 dark:border-gray-600 hover:border-blue-500'
                                            }`}
                                    >
                                        {task.status === 'completed' && (
                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                            </svg>
                                        )}
                                    </button>

                                    <div>
                                        <h3 className={`text-lg font-medium text-gray-900 dark:text-white ${task.status === 'completed' ? 'line-through text-gray-500' : ''}`}>
                                            {task.title}
                                        </h3>
                                        {task.description && (
                                            <p className="mt-1 text-gray-600 dark:text-gray-400 text-sm whitespace-pre-wrap">
                                                {task.description}
                                            </p>
                                        )}
                                        <div className="flex items-center gap-3 mt-3">
                                            <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${priorityColor(task.priority)}`}>
                                                {task.priority === 'high' ? 'Высокий' : task.priority === 'medium' ? 'Средний' : 'Низкий'}
                                            </span>
                                            {task.due_date && (
                                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                                    📅 {new Date(task.due_date).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <button
                                    onClick={() => handleDeleteTask(task.id)}
                                    className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity p-2"
                                    title="Удалить"
                                >
                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Новая задача</h2>
                        <form onSubmit={handleCreateTask} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Название</label>
                                <input
                                    type="text"
                                    required
                                    value={newTask.title}
                                    onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="Что нужно сделать?"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Описание</label>
                                <textarea
                                    value={newTask.description}
                                    onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                                    placeholder="Детали задачи..."
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Приоритет</label>
                                <select
                                    value={newTask.priority}
                                    onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                                >
                                    <option value="low">Низкий</option>
                                    <option value="medium">Средний</option>
                                    <option value="high">Высокий</option>
                                </select>
                            </div>

                            <div className="flex justify-end gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="px-4 py-2 text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-lg"
                                >
                                    Отмена
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50"
                                >
                                    Создать
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
