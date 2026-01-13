"use client";

import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, User, AlignLeft, Flag, X, MapPin } from "lucide-react";
import { cn } from "@/lib/utils";

interface Task {
    id: string;
    title: string;
    description?: string;
    status: "todo" | "in_progress" | "done";
    priority: "low" | "medium" | "high";
    assignee?: {
        full_name: string;
        avatar_url?: string;
    };
    creator?: {
        role: string;
    };
    deadline?: string;
    origin_board_item_id?: string; // If linked
}

interface TaskDetailsModalProps {
    task: Task | null;
    onClose: () => void;
}

export function TaskDetailsModal({ task, onClose }: TaskDetailsModalProps) {
    if (!task) return null;

    // Helper to linkify text
    const linkify = (text: string) => {
        const urlRegex = /(https?:\/\/[^\s]+)/g;
        return text.split(urlRegex).map((part, index) => {
            if (part.match(urlRegex)) {
                return (
                    <a key={index} href={part} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    return (
        <AnimatePresence>
            {task && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-lg shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden max-h-[80vh] relative"
                    >
                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="absolute top-4 right-4 p-2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>

                        {/* Header */}
                        <div className="px-6 py-6 border-b border-zinc-100 dark:border-zinc-800">
                            <div className="flex items-center gap-3 mb-3">
                                <span className={cn(
                                    "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                    task.status === 'done' ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" :
                                        task.status === 'in_progress' ? "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400" :
                                            "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                )}>
                                    {task.status.replace('_', ' ')}
                                </span>
                                {task.priority && (
                                    <span className={cn(
                                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                                        task.priority === 'high' ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
                                            task.priority === 'medium' ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" :
                                                "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                    )}>
                                        {task.priority} Priority
                                    </span>
                                )}
                            </div>
                            <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100 leading-tight">
                                {task.title}
                            </h2>
                        </div>

                        {/* Body */}
                        <div className="p-6 overflow-y-auto space-y-6">

                            {/* Description */}
                            <div className="space-y-2">
                                <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 text-xs font-semibold uppercase tracking-widest">
                                    <AlignLeft className="w-4 h-4" />
                                    Description
                                </div>
                                <div className="text-zinc-600 dark:text-zinc-300 text-sm leading-relaxed whitespace-pre-wrap">
                                    {task.description ? linkify(task.description) : <span className="italic text-zinc-400">No description provided.</span>}
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                {/* Assignee */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 text-xs font-semibold uppercase tracking-widest">
                                        <User className="w-4 h-4" />
                                        Assignee
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {task.assignee?.avatar_url ? (
                                            <img src={task.assignee.avatar_url} className="w-6 h-6 rounded-full" />
                                        ) : (
                                            <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center">
                                                <User className="w-3 h-3 text-zinc-500" />
                                            </div>
                                        )}
                                        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {task.assignee?.full_name || "Unassigned"}
                                        </span>
                                    </div>
                                </div>

                                {/* Deadline */}
                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 text-zinc-400 dark:text-zinc-500 text-xs font-semibold uppercase tracking-widest">
                                        <Calendar className="w-4 h-4" />
                                        Due Date
                                    </div>
                                    <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                        {task.deadline ? new Date(task.deadline).toLocaleDateString() : "No deadline"}
                                    </div>
                                </div>
                            </div>

                            {task.origin_board_item_id && (
                                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl border border-zinc-100 dark:border-zinc-800 flex items-center gap-3 text-sm text-zinc-500">
                                    <MapPin className="w-4 h-4" />
                                    <span>Originating from Board Item</span>
                                </div>
                            )}

                        </div>
                    </motion.div>

                    <div className="absolute inset-0 -z-10" onClick={onClose} />
                </div>
            )}
        </AnimatePresence>
    );
}
