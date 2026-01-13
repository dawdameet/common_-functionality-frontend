"use client";

import React, { useState } from "react";
import { X, Link as LinkIcon, Image as ImageIcon, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface AssignTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAssign: (data: { title: string; description: string; attachment?: string }) => void;
    assigneeName: string;
}

export function AssignTaskModal({ isOpen, onClose, onAssign, assigneeName }: AssignTaskModalProps) {
    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [attachment, setAttachment] = useState("");

    if (!isOpen) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!title) return;
        onAssign({ title, description, attachment });
        onClose();
        // Reset form
        setTitle("");
        setDescription("");
        setAttachment("");
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-md bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <div>
                        <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Assign Task</h2>
                        <p className="text-xs text-zinc-500">Assigning to <span className="font-semibold text-zinc-700 dark:text-zinc-300">{assigneeName}</span></p>
                    </div>
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
                            Task Title
                        </label>
                        <input
                            id="title"
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            placeholder="e.g. Review Q1 Roadmap"
                            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-zinc-400"
                            required
                            autoFocus
                        />
                    </div>

                    {/* Description */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="description" className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                            Description
                        </label>
                        <textarea
                            id="description"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="Add context or instructions..."
                            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-zinc-400 resize-none h-24"
                        />
                    </div>

                    {/* Attachment (Simplified to Link input for now) */}
                    <div className="flex flex-col gap-1.5">
                        <label htmlFor="attachment" className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                            <LinkIcon className="w-4 h-4 text-zinc-400" />
                            Attachment (URL)
                        </label>
                        <div className="relative">
                            <input
                                id="attachment"
                                type="url"
                                value={attachment}
                                onChange={(e) => setAttachment(e.target.value)}
                                placeholder="https://..."
                                className="w-full pl-9 px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors placeholder:text-zinc-400"
                            />
                            <div className="absolute left-3 top-2.5 text-zinc-400">
                                <LinkIcon className="w-4 h-4" />
                            </div>
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
                            Assign Task
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
