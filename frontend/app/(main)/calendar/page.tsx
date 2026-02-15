"use client";

import { useState, useEffect } from "react";
import { calendarApi } from "@/lib/api";

type CalendarEvent = {
    id: number;
    title: string;
    description?: string;
    start_time: string;
    end_time?: string;
    is_all_day: boolean;
};

export default function CalendarPage() {
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [newEvent, setNewEvent] = useState({
        title: "",
        description: "",
        start_time: new Date().toISOString().slice(0, 16),
        end_time: "",
        is_all_day: false
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const data = await calendarApi.list();
            setEvents(data);
        } catch (error) {
            console.error("Failed to fetch events:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            setSubmitting(true);
            const created = await calendarApi.create({
                ...newEvent,
                start_time: new Date(newEvent.start_time).toISOString(),
                end_time: newEvent.end_time ? new Date(newEvent.end_time).toISOString() : null
            });
            setEvents([...events, created].sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime()));
            setShowModal(false);
            setNewEvent({
                title: "",
                description: "",
                start_time: new Date().toISOString().slice(0, 16),
                end_time: "",
                is_all_day: false
            });
        } catch (error) {
            console.error("Failed to create event:", error);
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteEvent = async (id: number) => {
        if (!confirm("Удалить событие?")) return;
        try {
            await calendarApi.delete(id);
            setEvents(events.filter(e => e.id !== id));
        } catch (error) {
            console.error("Failed to delete event:", error);
        }
    };

    // Group events by date
    const eventsByDate = events.reduce((acc, event) => {
        const date = new Date(event.start_time).toLocaleDateString();
        if (!acc[date]) acc[date] = [];
        acc[date].push(event);
        return acc;
    }, {} as Record<string, CalendarEvent[]>);

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex justify-between items-center mb-8">
                <h1 className="text-3xl font-bold text-gray-800 dark:text-white">Календарь</h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
                >
                    <span>+</span> Событие
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Upcoming Events List (simplified view for now) */}
                <div className="lg:col-span-2 space-y-6">
                    {loading ? (
                        <div className="flex justify-center p-12">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                        </div>
                    ) : Object.keys(eventsByDate).length === 0 ? (
                        <div className="text-center py-12 text-gray-500 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                            <p className="text-lg">Нет предстоящих событий</p>
                        </div>
                    ) : (
                        Object.entries(eventsByDate).map(([date, dayEvents]) => (
                            <div key={date} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden">
                                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 font-medium text-gray-700 dark:text-gray-300 sticky top-0">
                                    {date}
                                </div>
                                <div className="divide-y divide-gray-100 dark:divide-gray-700">
                                    {dayEvents.map(event => (
                                        <div key={event.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors flex justify-between group">
                                            <div>
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                                                        {new Date(event.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                    <h3 className="font-medium text-gray-900 dark:text-white">{event.title}</h3>
                                                </div>
                                                {event.description && (
                                                    <p className="text-sm text-gray-500 dark:text-gray-400 ml-12">{event.description}</p>
                                                )}
                                            </div>
                                            <button
                                                onClick={() => handleDeleteEvent(event.id)}
                                                className="text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity self-start"
                                                title="Удалить"
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Mini Calendar / Info Panel */}
                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm h-fit">
                    <h2 className="text-lg font-semibold mb-4 text-gray-800 dark:text-gray-200">Информация</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Здесь отображаются ваши события. Вы можете добавлять новые встречи и напоминания.
                    </p>
                    <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
                        <p className="text-xs text-center text-gray-400">
                            Интеграция с Google Calendar и iCloud в разработке.
                        </p>
                    </div>
                </div>
            </div>

            {/* Create Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
                    <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md p-6">
                        <h2 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">Новое событие</h2>
                        <form onSubmit={handleCreateEvent} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Название</label>
                                <input
                                    type="text"
                                    required
                                    value={newEvent.title}
                                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    placeholder="Встреча с..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Начало</label>
                                    <input
                                        type="datetime-local"
                                        required
                                        value={newEvent.start_time}
                                        onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1 dark:text-gray-300">Конец (опц.)</label>
                                    <input
                                        type="datetime-local"
                                        value={newEvent.end_time}
                                        onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">Описание</label>
                                <textarea
                                    value={newEvent.description}
                                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white focus:ring-2 focus:ring-blue-500 h-24 resize-none"
                                    placeholder="Детали события..."
                                />
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
