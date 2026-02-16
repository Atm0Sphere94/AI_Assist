"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/api";
import {
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    format,
    isSameMonth,
    isSameDay,
    addMonths,
    subMonths,
    startOfWeek,
    endOfWeek,
    addWeeks,
    subWeeks,
    addDays,
    subDays,
} from "date-fns";
import { ru } from "date-fns/locale";

interface CalendarEvent {
    id: number;
    title: string;
    description: string | null;
    start_time: string;
    end_time: string | null;
    is_all_day: boolean;
}

export default function CalendarPage() {
    const [view, setView] = useState<"month" | "week" | "day" | "list">("month");
    const [currentDate, setCurrentDate] = useState(new Date());
    const [events, setEvents] = useState<CalendarEvent[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadEvents();
    }, [currentDate, view]);

    const loadEvents = async () => {
        setLoading(true);
        try {
            const response = await api.get("/calendar/");
            setEvents(response.data);
        } catch (error) {
            console.error("Error loading events:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const formData = new FormData();
        formData.append("file", file);

        try {
            await api.post("/calendar/import", formData);
            loadEvents();
            alert("Календарь импортирован успешно!");
        } catch (error) {
            console.error("Import error:", error);
            alert("Ошибка импорта");
        }
    };

    const navigate = (direction: "prev" | "next") => {
        if (view === "month") {
            setCurrentDate(direction === "next" ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
        } else if (view === "week") {
            setCurrentDate(direction === "next" ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
        } else if (view === "day") {
            setCurrentDate(direction === "next" ? addDays(currentDate, 1) : subDays(currentDate, 1));
        }
    };

    const getEventsForDate = (date: Date) => {
        return events.filter((event) => {
            const eventDate = new Date(event.start_time);
            return isSameDay(eventDate, date);
        });
    };

    const renderMonthView = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

        return (
            <div className="grid grid-cols-7 gap-1">
                {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"].map((day) => (
                    <div key={day} className="p-2 text-center font-medium text-sm bg-gray-100 dark:bg-gray-800">
                        {day}
                    </div>
                ))}
                {days.map((day) => {
                    const dayEvents = getEventsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <div
                            key={day.toISOString()}
                            className={`min-h-24 p-2 border rounded ${!isCurrentMonth ? "opacity-40 bg-gray-50 dark:bg-gray-900" : "bg-white dark:bg-gray-800"
                                } ${isToday ? "border-2 border-blue-500" : "border-gray-200 dark:border-gray-700"}`}
                        >
                            <div className="text-right text-sm mb-1">{format(day, "d")}</div>
                            <div className="space-y-1">
                                {dayEvents.slice(0, 2).map((event) => (
                                    <div
                                        key={event.id}
                                        className="text-xs p-1 bg-blue-500 text-white rounded truncate"
                                    >
                                        {event.title}
                                    </div>
                                ))}
                                {dayEvents.length > 2 && (
                                    <div className="text-xs text-gray-500">
                                        +{dayEvents.length - 2} ещё
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderListView = () => {
        const sortedEvents = [...events].sort((a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );

        return (
            <div className="space-y-2">
                {sortedEvents.length === 0 ? (
                    <p className="text-center text-gray-500 py-8">Нет событий</p>
                ) : (
                    sortedEvents.map((event) => (
                        <div key={event.id} className="p-4 border rounded bg-white dark:bg-gray-800">
                            <h3 className="font-medium">{event.title}</h3>
                            {event.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                                    {event.description}
                                </p>
                            )}
                            <p className="text-sm text-gray-500 mt-2">
                                {format(new Date(event.start_time), "d MMMM yyyy, HH:mm", { locale: ru })}
                                {event.end_time && ` - ${format(new Date(event.end_time), "HH:mm")}`}
                            </p>
                        </div>
                    ))
                )}
            </div>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">📅 Календарь</h1>
                <div>
                    <input
                        type="file"
                        accept=".ics"
                        onChange={handleImport}
                        className="hidden"
                        id="ics-upload"
                    />
                    <label htmlFor="ics-upload">
                        <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded cursor-pointer hover:bg-blue-700">
                            📥 Импорт .ics
                        </span>
                    </label>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => navigate("prev")}
                        className="px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        ◀
                    </button>
                    <button
                        onClick={() => setCurrentDate(new Date())}
                        className="px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        Сегодня
                    </button>
                    <button
                        onClick={() => navigate("next")}
                        className="px-3 py-1 border rounded hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        ▶
                    </button>
                    <div className="text-lg font-medium ml-4">
                        {view === "month" && format(currentDate, "LLLL yyyy", { locale: ru })}
                        {view === "week" &&
                            `${format(
                                startOfWeek(currentDate, { weekStartsOn: 1 }),
                                "d MMM",
                                { locale: ru }
                            )} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM yyyy", {
                                locale: ru,
                            })}`}
                        {view === "day" && format(currentDate, "d MMMM yyyy", { locale: ru })}
                        {view === "list" && "Все события"}
                    </div>
                </div>

                <div className="flex gap-2">
                    {["month", "week", "day", "list"].map((v) => (
                        <button
                            key={v}
                            onClick={() => setView(v as any)}
                            className={`px-3 py-1 rounded ${view === v
                                    ? "bg-blue-600 text-white"
                                    : "border hover:bg-gray-100 dark:hover:bg-gray-800"
                                }`}
                        >
                            {v === "month" ? "Месяц" : v === "week" ? "Неделя" : v === "day" ? "День" : "Список"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Calendar Views */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
                {loading ? (
                    <p className="text-center py-8">Загрузка...</p>
                ) : (
                    <>
                        {view === "month" && renderMonthView()}
                        {view === "list" && renderListView()}
                        {(view === "week" || view === "day") && (
                            <p className="text-center py-8 text-gray-500">
                                Вид {view === "week" ? "недели" : "дня"} в разработке...
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
