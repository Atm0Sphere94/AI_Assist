"use client";

import { useState, useEffect } from "react";
import {
    Calendar as CalendarIcon,
    Upload,
    ChevronLeft,
    ChevronRight,
    Clock,
    List as ListIcon,
    Grid3X3,
    LayoutGrid
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { api, calendarApi } from "@/lib/api";
import { cn } from "@/lib/utils";
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
    isToday,
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
            // Calculate range based on view to optimize fetch? 
            // For now fetching all, but API supports filtering.
            // Ideally we should pass start/end dates.
            let start = startOfMonth(currentDate);
            let end = endOfMonth(currentDate);

            if (view === 'week') {
                start = startOfWeek(currentDate, { weekStartsOn: 1 });
                end = endOfWeek(currentDate, { weekStartsOn: 1 });
            } else if (view === 'day') {
                start = currentDate;
                end = currentDate;
            }

            // Using ISO strings for API
            const data = await calendarApi.list(start.toISOString(), end.toISOString());
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
            await api.post("/api/calendar/import", formData);
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

    // --- Render Functions ---

    const renderMonthView = () => {
        const monthStart = startOfMonth(currentDate);
        const monthEnd = endOfMonth(currentDate);
        const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
        const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
        const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

        const weekDays = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];

        return (
            <div className="flex flex-col h-[calc(100vh-220px)] min-h-[500px] border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                {/* Weekday Headers */}
                <div className="grid grid-cols-7 border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                    {weekDays.map((day) => (
                        <div key={day} className="py-3 text-center text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-gray-200 dark:bg-gray-800 gap-[1px]">
                    {days.map((day) => {
                        const dayEvents = getEventsForDate(day);
                        const isCurrentMonth = isSameMonth(day, currentDate);
                        const isTodayDate = isToday(day);

                        return (
                            <div
                                key={day.toISOString()}
                                className={cn(
                                    "bg-white dark:bg-gray-900 p-2 flex flex-col transition-colors duration-200 hover:bg-gray-50 dark:hover:bg-gray-800/50",
                                    !isCurrentMonth && "bg-gray-50/30 dark:bg-gray-900/50 text-gray-400"
                                )}
                                onClick={() => {
                                    setCurrentDate(day);
                                    setView("day");
                                }}
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <span
                                        className={cn(
                                            "text-sm w-7 h-7 flex items-center justify-center rounded-full transition-all",
                                            isTodayDate
                                                ? "bg-blue-600 text-white font-bold shadow-md shadow-blue-500/30"
                                                : "text-gray-700 dark:text-gray-300 font-medium"
                                        )}
                                    >
                                        {format(day, "d")}
                                    </span>
                                </div>

                                <div className="flex-1 flex flex-col gap-1 overflow-hidden">
                                    {dayEvents.slice(0, 3).map((event) => (
                                        <div
                                            key={event.id}
                                            className={cn(
                                                "text-xs px-2 py-1 rounded-md truncate font-medium transition-transform hover:scale-[1.02] cursor-pointer border",
                                                isTodayDate
                                                    ? "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-200 dark:border-blue-800"
                                                    : "bg-gray-100 text-gray-700 border-gray-200 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700"
                                            )}
                                            title={event.title}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                // Handle event click
                                            }}
                                        >
                                            <div className="flex items-center gap-1">
                                                <div className={cn("w-1.5 h-1.5 rounded-full", isTodayDate ? "bg-blue-500" : "bg-gray-400")}></div>
                                                <span className="truncate">{event.title}</span>
                                            </div>
                                        </div>
                                    ))}
                                    {dayEvents.length > 3 && (
                                        <div className="text-[10px] text-gray-500 pl-1 font-medium hover:text-blue-600 transition-colors">
                                            +{dayEvents.length - 3} ещё...
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderTimeGrid = (days: Date[]) => {
        const hours = Array.from({ length: 24 }, (_, i) => i);
        const cellHeight = 60; // px per hour

        // Current time indicator position
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTimeTop = (currentHour * cellHeight) + ((currentMinute / 60) * cellHeight);

        return (
            <div className="flex flex-col h-full border rounded-xl overflow-hidden shadow-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
                {/* Header */}
                <div className="flex border-b border-gray-200 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="w-16 flex-shrink-0 border-r border-gray-200 dark:border-gray-700/50"></div>
                    {days.map((day) => {
                        const isTodayDate = isToday(day);
                        return (
                            <div key={day.toISOString()} className="flex-1 py-3 text-center border-r border-gray-100 dark:border-gray-800 last:border-r-0">
                                <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                                    {format(day, "EEE", { locale: ru })}
                                </div>
                                <div
                                    className={cn(
                                        "text-xl inline-flex items-center justify-center w-8 h-8 rounded-full font-medium transition-colors",
                                        isTodayDate
                                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                                            : "text-gray-900 dark:text-gray-100"
                                    )}
                                >
                                    {format(day, "d")}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Scrollable Time Grid */}
                <div className="flex-1 overflow-y-auto relative custom-scrollbar">
                    <div className="flex relative" style={{ height: hours.length * cellHeight }}>
                        {/* Time labels sidebar */}
                        <div className="w-16 flex-shrink-0 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700/50 z-10 sticky left-0">
                            {hours.map((hour) => (
                                <div
                                    key={hour}
                                    className="relative"
                                    style={{ height: cellHeight }}
                                >
                                    <span className="absolute -top-3 right-2 text-xs text-gray-400 dark:text-gray-500 font-medium">
                                        {hour}:00
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Grid lines & Events */}
                        <div className="flex-1 relative bg-white dark:bg-gray-900/50">
                            {/* Horizontal Hour Lines */}
                            {hours.map((hour) => (
                                <div
                                    key={hour}
                                    className="absolute left-0 right-0 border-t border-gray-100 dark:border-gray-800 w-full"
                                    style={{ top: hour * cellHeight, height: cellHeight }}
                                ></div>
                            ))}

                            {/* Current Time Indicator logic */}
                            {days.some(d => isToday(d)) && (
                                <div
                                    className="absolute left-0 right-0 border-t-2 border-red-500 z-20 pointer-events-none"
                                    style={{ top: currentTimeTop }}
                                >
                                    <div className="absolute -left-2 -top-1.5 w-3 h-3 bg-red-500 rounded-full"></div>
                                </div>
                            )}

                            {/* Vertical Day Columns & Events */}
                            <div className="absolute inset-0 flex">
                                {days.map((day, dayIndex) => {
                                    const dayEvents = getEventsForDate(day);

                                    return (
                                        <div
                                            key={day.toISOString()}
                                            className="flex-1 relative border-r border-gray-100 dark:border-gray-800 last:border-r-0 hover:bg-gray-50/30 dark:hover:bg-gray-800/30 transition-colors"
                                        >
                                            {dayEvents.map((event) => {
                                                const startDate = new Date(event.start_time);
                                                const endDate = event.end_time ? new Date(event.end_time) : addDays(startDate, 0.041); // default 1 hour if null

                                                const startHour = startDate.getHours() + (startDate.getMinutes() / 60);
                                                const endHour = endDate.getHours() + (endDate.getMinutes() / 60);
                                                const duration = Math.max(endHour - startHour, 0.5); // Min 30 mins visual

                                                return (
                                                    <div
                                                        key={event.id}
                                                        className="absolute inset-x-1 rounded-md p-2 text-xs border bg-blue-100 border-blue-200 text-blue-700 dark:bg-blue-900/40 dark:border-blue-700/50 dark:text-blue-100 overflow-hidden hover:z-20 hover:shadow-lg transition-all cursor-pointer"
                                                        style={{
                                                            top: startHour * cellHeight,
                                                            height: duration * cellHeight,
                                                        }}
                                                        title={`${event.title} (${format(startDate, 'HH:mm')} - ${format(endDate, 'HH:mm')})`}
                                                    >
                                                        <div className="font-semibold truncate">{event.title}</div>
                                                        <div className="text-blue-600 dark:text-blue-300 opacity-80 text-[10px]">
                                                            {format(startDate, 'HH:mm')} - {format(endDate, 'HH:mm')}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderWeekView = () => {
        const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
        const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
        return renderTimeGrid(weekDays);
    };

    const renderDayView = () => {
        return renderTimeGrid([currentDate]);
    };

    const renderListView = () => {
        const sortedEvents = [...events].sort((a, b) =>
            new Date(a.start_time).getTime() - new Date(b.start_time).getTime()
        );

        // Group events by date
        const groupedEvents: { [key: string]: CalendarEvent[] } = {};

        sortedEvents.forEach(event => {
            const date = new Date(event.start_time);
            const key = format(date, 'yyyy-MM-dd');
            if (!groupedEvents[key]) groupedEvents[key] = [];
            groupedEvents[key].push(event);
        });

        const sortedKeys = Object.keys(groupedEvents).sort();

        if (sortedEvents.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center h-full min-h-[400px] text-center p-8 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700">
                    <div className="bg-gray-100 dark:bg-gray-800 p-4 rounded-full mb-4">
                        <CalendarIcon className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100">Нет событий</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs">
                        В выбранном периоде событий не найдено. Попробуйте выбрать другой месяц или импортировать календарь.
                    </p>
                </div>
            );
        }

        return (
            <div className="space-y-6 pb-20 max-w-3xl mx-auto">
                {sortedKeys.map((dateKey) => {
                    const date = new Date(dateKey);
                    const groupEvents = groupedEvents[dateKey];
                    const isTodayDate = isToday(date);

                    return (
                        <div key={dateKey} className="space-y-3">
                            <div className="flex items-center gap-3 sticky top-0 bg-gray-50/95 dark:bg-gray-950/95 backdrop-blur-sm py-2 z-10 -mx-2 px-2 rounded-lg">
                                <div className={cn(
                                    "text-2xl font-bold w-12 text-center leading-none",
                                    isTodayDate ? "text-blue-600 dark:text-blue-400" : "text-gray-900 dark:text-gray-100"
                                )}>
                                    {format(date, "d")}
                                </div>
                                <div className="flex flex-col">
                                    <span className={cn("text-sm font-medium uppercase tracking-wider", isTodayDate ? "text-blue-600 dark:text-blue-400" : "text-gray-500 dark:text-gray-400")}>
                                        {format(date, "EEEE", { locale: ru })}
                                        {isTodayDate && <span className="ml-2 px-2 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 text-[10px] rounded-full normal-case tracking-normal">Сегодня</span>}
                                    </span>
                                    <span className="text-xs text-gray-400 dark:text-gray-500">
                                        {format(date, "MMMM yyyy", { locale: ru })}
                                    </span>
                                </div>
                                <div className="flex-1 h-px bg-gray-200 dark:bg-gray-800 ml-4"></div>
                            </div>

                            <div className="grid gap-3 pl-4 md:pl-14">
                                {groupEvents.map((event) => (
                                    <Card
                                        key={event.id}
                                        className="group p-4 flex flex-col sm:flex-row gap-4 hover:shadow-md transition-all duration-200 border-l-4 border-l-blue-500 hover:border-l-blue-600 dark:bg-gray-900 dark:border-gray-800 dark:border-l-blue-500"
                                    >
                                        <div className="flex flex-col sm:w-32 flex-shrink-0 text-sm">
                                            <span className="font-semibold text-gray-900 dark:text-gray-100">
                                                {format(new Date(event.start_time), "HH:mm")}
                                            </span>
                                            {event.end_time && (
                                                <span className="text-gray-500 dark:text-gray-400 text-xs">
                                                    до {format(new Date(event.end_time), "HH:mm")}
                                                </span>
                                            )}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <h3 className="text-base font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                                {event.title}
                                            </h3>
                                            {event.description && (
                                                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                                                    {event.description}
                                                </p>
                                            )}
                                        </div>
                                    </Card>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    const getViewIcon = (v: string) => {
        switch (v) {
            case "month": return <LayoutGrid className="w-4 h-4" />;
            case "week": return <Grid3X3 className="w-4 h-4" />;
            case "day": return <Clock className="w-4 h-4" />;
            case "list": return <ListIcon className="w-4 h-4" />;
            default: return <LayoutGrid className="w-4 h-4" />;
        }
    };

    return (
        <div className="p-6 max-w-7xl mx-auto h-[100vh] flex flex-col">
            {/* Header & Toolbar */}
            <div className="flex flex-col md:flex-row items-center justify-between mb-6 gap-4 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md sticky top-0 z-10 p-4 -mx-4 -mt-4 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-xl text-blue-600 dark:text-blue-400 shadow-sm">
                        <CalendarIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-none">Календарь</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 first-letter:uppercase">
                            {format(currentDate, "EEEE, d MMMM yyyy", { locale: ru })}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                    <Button variant="ghost" size="icon" onClick={() => navigate("prev")} className="h-8 w-8 hover:bg-white dark:hover:bg-gray-700 rounded-md">
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <div className="px-4 font-semibold min-w-[140px] text-center text-sm">
                        {view === "month" && format(currentDate, "LLLL yyyy", { locale: ru })}
                        {view === "week" &&
                            `${format(startOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM", { locale: ru })} - ${format(endOfWeek(currentDate, { weekStartsOn: 1 }), "d MMM yyyy", { locale: ru })}`
                        }
                        {view === "day" && format(currentDate, "d MMMM yyyy", { locale: ru })}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => navigate("next")} className="h-8 w-8 hover:bg-white dark:hover:bg-gray-700 rounded-md">
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1"></div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentDate(new Date())}
                        className="h-8 hover:bg-white dark:hover:bg-gray-700 text-xs font-medium px-3"
                    >
                        Сегодня
                    </Button>
                </div>

                <div className="flex items-center gap-3">
                    <Tabs value={view} onValueChange={(v) => setView(v as any)} className="hidden md:block">
                        <TabsList className="grid w-full grid-cols-4 h-9 p-1 bg-gray-100 dark:bg-gray-800">
                            {["month", "week", "day", "list"].map((v) => (
                                <TabsTrigger
                                    key={v}
                                    value={v}
                                    className="text-xs gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 data-[state=active]:shadow-sm transition-all duration-300"
                                >
                                    {getViewIcon(v)}
                                    <span className="capitalize">{v === 'month' ? 'Месяц' : v === 'week' ? 'Неделя' : v === 'day' ? 'День' : 'Список'}</span>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </Tabs>

                    <input
                        type="file"
                        accept=".ics"
                        onChange={handleImport}
                        className="hidden"
                        id="ics-upload"
                    />
                    <label htmlFor="ics-upload">
                        <Button size="sm" className="gap-2 bg-blue-600 hover:bg-blue-700 shadow-md shadow-blue-600/20">
                            <Upload className="w-4 h-4" />
                            <span className="hidden sm:inline">Импорт</span>
                        </Button>
                    </label>
                </div>
            </div>

            {/* Main Content Area */}
            <div className="flex-1 overflow-hidden relative">
                {loading && (
                    <div className="absolute inset-0 z-50 bg-white/50 dark:bg-gray-900/50 backdrop-blur-sm flex items-center justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    </div>
                )}

                {view === "month" && renderMonthView()}
                {view === "week" && renderWeekView()}
                {view === "day" && renderDayView()}
                {view === "list" && renderListView()}
            </div>
        </div>
    );
}
