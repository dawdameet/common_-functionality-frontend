import React, { useState, useEffect } from "react";
import { X, Calendar as CalendarIcon, Clock, Type } from "lucide-react";
import { cn } from "@/lib/utils";
import { CalendarEvent } from "./CalendarView";

interface AddEventModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (event: Omit<CalendarEvent, "id">) => void;
    initialDate?: string;
    initialEvent?: CalendarEvent;
}

export function AddEventModal({ isOpen, onClose, onSave, initialDate, initialEvent }: AddEventModalProps) {
    const [title, setTitle] = useState("");
    const [date, setDate] = useState("");
    const [time, setTime] = useState("");
    const [type, setType] = useState<CalendarEvent["type"]>("meeting");

    useEffect(() => {
        if (isOpen) {
            if (initialEvent) {
                setTitle(initialEvent.title);
                setDate(initialEvent.date);
                // Parse time back if needed, but for now let's assume it matches or is empty
                // Our time stored is "10:00 AM". Input needs "10:00" (24h)
                // Simple parsing for now:
                let timeVal = "";
                if (initialEvent.time) {
                    const parts = initialEvent.time.split(' ');
                    if (parts.length === 2) {
                        const [hm, ampm] = parts;
                        let [h, m] = hm.split(':').map(Number);
                        if (ampm === 'PM' && h < 12) h += 12;
                        if (ampm === 'AM' && h === 12) h = 0;
                        timeVal = `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
                    } else {
                        timeVal = initialEvent.time;
                    }
                }
                setTime(timeVal);
                setType(initialEvent.type);
            } else {
                if (initialDate) {
                    setDate(initialDate);
                } else {
                    setDate(new Date().toISOString().split("T")[0]);
                }
                // Reset other fields
                setTitle("");
                setTime("09:00");
                setType("meeting");
            }
        }
    }, [isOpen, initialDate, initialEvent]);

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title || !date) return;

        // Format time to AM/PM if needed, or just keep as is.
        // The input type="time" gives HH:MM in 24h format. 
        // Let's simplified and convert to AM/PM for display consistency with existing data, 
        // or just store as is. The existing data has "10:00 AM".
        // Let's do a simple conversion for the "time" field to match "10:00 AM" format ideally, 
        // but for now keeping it simple is likely fine. 
        // Actually, let's try to match the style.

        let formattedTime = time;
        if (time) {
            const [hours, minutes] = time.split(':');
            const h = parseInt(hours, 10);
            const ampm = h >= 12 ? 'PM' : 'AM';
            const h12 = h % 12 || 12;
            formattedTime = `${h12}:${minutes} ${ampm}`;
        }

        onSave({
            title,
            date,
            time: formattedTime,
            type,
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">{initialEvent ? "Edit Event" : "Add New Event"}</h2>
                    <button
                        onClick={onClose}
                        className="p-1 rounded-md text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">

                    {/* Title */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="title" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Event Title
                        </label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Project Review"
                            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-zinc-400"
                            required
                            autoFocus
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Date */}
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="date" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                <CalendarIcon className="w-4 h-4 text-zinc-400" />
                                Date
                            </label>
                            <input
                                id="date"
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                                required
                            />
                        </div>

                        {/* Time */}
                        <div className="flex flex-col gap-1.5">
                            <label htmlFor="time" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                                <Clock className="w-4 h-4 text-zinc-400" />
                                Time
                            </label>
                            <input
                                id="time"
                                type="time"
                                value={time}
                                onChange={(e) => setTime(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                            />
                        </div>
                    </div>

                    {/* Type */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <Type className="w-4 h-4 text-zinc-400" />
                            Type
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            {(["meeting", "deadline", "reminder"] as const).map((t) => (
                                <button
                                    key={t}
                                    type="button"
                                    onClick={() => setType(t)}
                                    className={cn(
                                        "px-3 py-2 rounded-lg text-sm font-medium border transition-all capitalize",
                                        type === t
                                            ? "bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300"
                                            : "bg-white dark:bg-zinc-950 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                                    )}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-3 mt-4 pt-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium shadow-sm hover:scale-105 transition-all"
                        >
                            {initialEvent ? "Save Changes" : "Add Event"}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
