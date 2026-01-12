"use client";

import React, { useState } from "react";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  type: "meeting" | "deadline" | "reminder";
}

const initialEvents: CalendarEvent[] = [
  {
    id: "1",
    title: "Project Kickoff",
    date: new Date().toISOString().split("T")[0],
    time: "10:00 AM",
    type: "meeting",
  },
  {
    id: "2",
    title: "Design Review",
    date: new Date(Date.now() + 86400000).toISOString().split("T")[0], // Tomorrow
    time: "2:00 PM",
    type: "meeting",
  },
];

export function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };

  const isToday = (day: number) => {
    const today = new Date();
    return (
      day === today.getDate() &&
      currentDate.getMonth() === today.getMonth() &&
      currentDate.getFullYear() === today.getFullYear()
    );
  };

  const getEventsForDay = (day: number) => {
    const dateStr = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    return events.filter(e => e.date === dateStr);
  };

  return (
    <div className="w-full h-full bg-white dark:bg-zinc-950 p-4 md:p-8 overflow-y-auto">
      <div className="max-w-6xl mx-auto h-full flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-light tracking-tight text-zinc-900 dark:text-zinc-100">
            {currentDate.toLocaleString("default", { month: "long", year: "numeric" })}
          </h1>
          <div className="flex items-center gap-2">
            <button
              onClick={prevMonth}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={nextMonth}
              className="p-2 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
            <button className="ml-4 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium shadow-lg hover:scale-105 transition-transform flex items-center gap-2">
              <Plus className="w-4 h-4" />
              <span>Add Event</span>
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-[auto_1fr] gap-px bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          {/* Weekday Headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div
              key={day}
              className="bg-zinc-50 dark:bg-zinc-900/50 p-4 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400"
            >
              {day}
            </div>
          ))}

          {/* Days */}
          {Array.from({ length: 42 }).map((_, i) => {
            const dayNumber = i - firstDayOfMonth + 1;
            const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
            const dayEvents = isCurrentMonth ? getEventsForDay(dayNumber) : [];

            return (
              <div
                key={i}
                className={cn(
                  "bg-white dark:bg-zinc-950 min-h-[120px] p-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50 flex flex-col gap-1",
                  !isCurrentMonth && "bg-zinc-50/50 dark:bg-zinc-900/20 text-zinc-300 dark:text-zinc-700"
                )}
              >
                {isCurrentMonth && (
                  <>
                    <div className="flex justify-between items-start">
                      <span
                        className={cn(
                          "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium",
                          isToday(dayNumber)
                            ? "bg-blue-600 text-white"
                            : "text-zinc-700 dark:text-zinc-300"
                        )}
                      >
                        {dayNumber}
                      </span>
                    </div>
                    <div className="flex-1 flex flex-col gap-1 mt-1 overflow-y-auto">
                        {dayEvents.map(event => (
                            <div key={event.id} className="text-xs px-2 py-1 rounded bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 truncate font-medium border border-blue-200 dark:border-blue-800/50">
                                {event.time} {event.title}
                            </div>
                        ))}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
