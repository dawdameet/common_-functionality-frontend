"use client";

import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, Plus, Video } from "lucide-react";
import { cn } from "@/lib/utils";
import { AddEventModal } from "./AddEventModal";
import { useUser } from "../auth/UserContext";
import { createClient } from "@/utils/supabase/client";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string;
  type: "meeting" | "deadline" | "reminder";
  isGlobal?: boolean;
  authorId?: string;
}

// initialEvents array is removed as events will be fetched from Supabase

export function CalendarView() {
  const { currentUser } = useUser();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]); // Initialize with empty array
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | undefined>(undefined);
  const supabase = createClient(); // Initialize Supabase client

  useEffect(() => {
    const fetchEvents = async () => {
      const { data, error } = await supabase.from('calendar_events').select('*');
      if (error) {
        console.error("Error fetching events:", error);
        return;
      }
      if (data) {
        setEvents(data.map(e => ({
          id: e.id,
          title: e.title,
          type: e.type as any, // Type assertion for 'type'
          date: new Date(e.start_time).toISOString().split('T')[0],
          time: e.start_time.includes('T') ? new Date(e.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }) : undefined, // Map time if present
          isGlobal: e.is_global,
          authorId: e.owner_id
        })));
      }
    };
    fetchEvents();

    // Set up Realtime listener
    const channel = supabase.channel('calendar_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'calendar_events' }, (payload: RealtimePostgresChangesPayload<any>) => {
        // Re-fetch for simplicity on any change
        fetchEvents();
      })
      .subscribe();

    // Cleanup function for the effect
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]); // Dependency array includes supabase to ensure effect re-runs if client changes (though it's usually static)

  const daysInMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
  const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1).getDay();
  const daysInPrevMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0).getDate();

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
    return events.filter(e => {
      const isDateMatch = e.date === dateStr;
      // Ensure currentUser is not null before accessing its properties
      const isVisible = e.isGlobal || (currentUser && e.authorId === currentUser.id);
      return isDateMatch && isVisible;
    });
  };

  const handleAddEvent = (dateStr?: string) => {
    setSelectedDate(dateStr);
    setSelectedEvent(undefined);
    setIsModalOpen(true);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setSelectedDate(undefined);
    setIsModalOpen(true);
  };

  const handleSaveEvent = async (eventData: Omit<CalendarEvent, "id">) => {
    const startTime = new Date(`${eventData.date}T${eventData.time || '09:00'}:00`).toISOString();
    const endTime = new Date(new Date(startTime).getTime() + 60 * 60 * 1000).toISOString(); // Default +1 hour

    if (selectedEvent) {
      // Update existing event
      const { error } = await supabase.from('calendar_events').update({
        title: eventData.title,
        start_time: startTime,
        end_time: endTime,
        type: eventData.type,
        is_global: eventData.isGlobal,
        owner_id: currentUser?.id // Use optional chaining for currentUser
      }).eq('id', selectedEvent.id);

      if (error) {
        alert("Failed to update event: " + error.message);
      } else {
        setIsModalOpen(false);
        // Realtime listener will handle re-fetching
      }
    } else {
      // Add new event
      const { error } = await supabase.from('calendar_events').insert({
        title: eventData.title,
        start_time: startTime,
        end_time: endTime,
        type: eventData.type,
        is_global: eventData.isGlobal,
        owner_id: currentUser?.id // Use optional chaining for currentUser
      });

      if (error) {
        alert("Failed to add event: " + error.message);
      } else {
        setIsModalOpen(false);
        // Realtime listener will handle re-fetching
      }
    }
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
            <button
              onClick={async () => {
                const startTime = new Date().toISOString();
                const endTime = new Date(Date.now() + 60*60*1000).toISOString();
                // Create a global event so others can see and join
                const { data, error } = await supabase.from('calendar_events').insert({
                    title: "Instant Meeting (Live)",
                    start_time: startTime,
                    end_time: endTime,
                    type: "meeting",
                    is_global: true,
                    owner_id: currentUser?.id
                }).select().single();

                if (data) {
                    window.open(`/meet/${data.id}`, '_blank');
                } else {
                    console.error("Failed to create meeting", error);
                    // Fallback
                    window.open(`/meet/${crypto.randomUUID()}`, '_blank');
                }
              }}
              className="ml-4 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
            >
              <Video className="w-4 h-4" />
              <span>Instant Meet</span>
            </button>
            <button
              onClick={() => handleAddEvent()}
              className="ml-4 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Event</span>
            </button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 grid grid-cols-7 grid-rows-[auto_1fr] gap-px bg-zinc-200 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
          {/* Weekday Headers */}
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, index) => (
            <div
              key={day}
              className={cn(
                "bg-zinc-50 dark:bg-zinc-900/50 p-4 text-center text-sm font-medium text-zinc-500 dark:text-zinc-400",
                index === 0 && "text-red-500 dark:text-red-400"
              )}
            >
              {day}
            </div>
          ))}

          {/* Days */}
          {Array.from({ length: 42 }).map((_, i) => {
            const dayNumber = i - firstDayOfMonth + 1;
            const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth;
            const dayEvents = isCurrentMonth ? getEventsForDay(dayNumber) : [];
            const isSunday = i % 7 === 0;

            let displayDay = dayNumber;
            if (dayNumber <= 0) {
              displayDay = daysInPrevMonth + dayNumber;
            } else if (dayNumber > daysInMonth) {
              displayDay = dayNumber - daysInMonth;
            }

            return (
              <div
                key={i}
                className={cn(
                  "group bg-white dark:bg-zinc-950 min-h-[120px] p-2 transition-colors hover:bg-zinc-50 dark:hover:bg-zinc-900/50 flex flex-col gap-1 cursor-pointer",
                  !isCurrentMonth && "bg-zinc-50/50 dark:bg-zinc-900/20",
                  isSunday && "bg-red-50/30 dark:bg-red-900/5"
                )}
                onClick={() => {
                  if (isCurrentMonth) {
                    handleAddEvent(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`);
                  }
                }}
              >
                <div className="flex justify-between items-start">
                  <span
                    className={cn(
                      "w-7 h-7 flex items-center justify-center rounded-full text-sm font-medium transition-colors",
                      isCurrentMonth && isToday(dayNumber)
                        ? "bg-blue-600 text-white"
                        : isCurrentMonth
                          ? cn("text-zinc-700 dark:text-zinc-300 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-800", isSunday && "text-red-500 dark:text-red-400")
                          : cn("text-zinc-400 dark:text-zinc-600 opacity-50", isSunday && "text-red-400/50 dark:text-red-400/50")
                    )}
                  >
                    {displayDay}
                  </span>
                  {isCurrentMonth && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddEvent(`${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(dayNumber).padStart(2, "0")}`);
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded transition-all text-zinc-400 hover:text-zinc-600 dark:text-zinc-500 dark:hover:text-zinc-300"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  )}
                </div>
                {isCurrentMonth && (
                  <div className="flex-1 flex flex-col gap-1 mt-1 overflow-y-auto">
                    {dayEvents.map(event => (
                      <div
                        key={event.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEventClick(event);
                        }}
                        className={cn(
                          "text-xs px-2 py-1 rounded truncate font-medium border transition-all hover:scale-[1.02] cursor-pointer",
                          // Base colors by type
                          event.type === "meeting" && "bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/50",
                          event.type === "deadline" && "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800/50",
                          event.type === "reminder" && "bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/50",

                          // Style differentiation for Global vs Personal
                          event.isGlobal ? "font-bold shadow-sm" : "opacity-80 border-dashed"
                        )}
                      >
                        {event.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <AddEventModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveEvent}
        initialDate={selectedDate}
        initialEvent={selectedEvent}
        currentUser={currentUser}
      />
    </div>
  );
}

