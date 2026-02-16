"use client";

import { useState, useEffect } from "react";
import { Calendar as CalendarIcon, Upload, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { api, calendarApi } from "@/lib/api";
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
            const data = await calendarApi.list();
            setEvents(data);
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
                    <div key={day} className="p-2 text-center font-medium text-sm">
                        {day}
                    </div>
                ))}
                {days.map((day) => {
                    const dayEvents = getEventsForDate(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isToday = isSameDay(day, new Date());

                    return (
                        <Card
                            key={day.toISOString()}
                            className={`min-h-24 p-2 ${!isCurrentMonth ? "opacity-40" : ""
                                } ${isToday ? "border-2 border-primary" : ""}`}
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
                                    <div className="text-xs text-muted-foreground">
                                        +{dayEvents.length - 2} ещё
                                    </div>
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>
        );
    };

    const renderWeekView = () => {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
        const hours = Array.from({ length: 24 }, (_, i) => i);

        return (
            <div className="flex gap-1">
                <div className="w-16">
                    <div className="h-12" />
                    {hours.map((hour) => (
                        <div key={hour} className="h-12 text-xs text-right pr-2 text-muted-foreground">
                            {hour}:00
                        </div>
                    ))}
                </div>
                {weekDays.map((day) => {
                    const dayEvents = getEventsForDate(day);
                    return (
                        <div key={day.toISOString()} className="flex-1">
                            <div className="h-12 text-center border-b p-2">
                                <div className="font-medium">{format(day, "EEE", { locale: ru })}</div>
                                <div className="text-sm text-muted-foreground">{format(day, "d MMM")}</div>
                            </div>
                            <div className="relative">
                                {hours.map((hour) => (
                                    <div key={hour} className="h-12 border-b border-border" />
                                ))}
                                {dayEvents.map((event) => {
                                    const eventHour = new Date(event.start_time).getHours();
                                    return (
                                        <div
                                            key={event.id}
                                            className="absolute left-0 right-0 bg-blue-500 text-white p-1 text-xs rounded mx-1"
                                            style={{ top: `${eventHour * 48}px`, height: "46px" }}
                                        >
                                            {event.title}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const renderDayView = () => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const dayEvents = getEventsForDate(currentDate);

        return (
            <div className="flex gap-4">
                <div className="w-16">
                    {hours.map((hour) => (
                        <div key={hour} className="h-16 text-xs text-right pr-2 text-muted-foreground">
                            {hour}:00
                        </div>
                    ))}
                </div>
                <div className="flex-1 relative">
                    {hours.map((hour) => (
                        <div key={hour} className="h-16 border-b border-border" />
                    ))}
                    {dayEvents.map((event) => {
                        const eventHour = new Date(event.start_time).getHours();
                        return (
                            <div
                                key={event.id}
                                className="absolute left-0 right-0 bg-blue-500 text-white p-2 rounded mr-4"
                                style={{ top: `${eventHour * 64}px`, height: "60px" }}
                            >
                                <div className="font-medium">{event.title}</div>
                                {event.description && (
                                    <div className="text-xs opacity-80">{event.description}</div>
                                )}
                            </div>
                        );
                    })}
                </div>
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
                    <p className="text-center text-muted-foreground py-8">Нет событий</p>
                ) : (
                    sortedEvents.map((event) => (
                        <Card key={event.id} className="p-4">
                            <div className="flex items-start justify-between">
                                <div>
                                    <h3 className="font-medium">{event.title}</h3>
                                    {event.description && (
                                        <p className="text-sm text-muted-foreground mt-1">
                                            {event.description}
                                        </p>
                                    )}
                                    <p className="text-sm text-muted-foreground mt-2">
                                        {format(new Date(event.start_time), "d MMMM yyyy, HH:mm", {
                                            locale: ru,
                                        })}
                                        {event.end_time &&
                                            ` - ${format(new Date(event.end_time), "HH:mm")}`}
                                    </p>
                                </div>
                            </div>
                        </Card>
                    ))
                )}
            </div>
        );
    };

    return (
        <div className="p-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                    <h1 className="text-3xl font-bold flex items-center gap-2">
                        <CalendarIcon className="w-8 h-8" />
                        Календарь
                    </h1>
                </div>
                <div className="flex items-center gap-2">
                    <input
                        type="file"
                        accept=".ics"
                        onChange={handleImport}
                        className="hidden"
                        id="ics-upload"
                    />
                    <label htmlFor="ics-upload">
                        <Button asChild>
                            <span className="flex items-center gap-2 cursor-pointer">
                                <Upload className="w-4 h-4" />
                                Импорт .ics
                            </span>
                        </Button>
                    </label>
                </div>
            </div>

            {/* Navigation */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => navigate("prev")}>
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setCurrentDate(new Date())}
                    >
                        Сегодня
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => navigate("next")}>
                        <ChevronRight className="w-4 h-4" />
                    </Button>
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
                    </div>
                </div>

                <Tabs value={view} onValueChange={(v) => setView(v as any)}>
                    <TabsList>
                        <TabsTrigger value="month">Месяц</TabsTrigger>
                        <TabsTrigger value="week">Неделя</TabsTrigger>
                        <TabsTrigger value="day">День</TabsTrigger>
                        <TabsTrigger value="list">Список</TabsTrigger>
                    </TabsList>
                </Tabs>
            </div>

            {/* Calendar Views */}
            <div className="bg-card rounded-lg border p-4">
                {loading ? (
                    <p className="text-center py-8">Загрузка...</p>
                ) : (
                    <>
                        {view === "month" && renderMonthView()}
                        {view === "week" && renderWeekView()}
                        {view === "day" && renderDayView()}
                        {view === "list" && renderListView()}
                    </>
                )}
            </div>
        </div>
    );
}
