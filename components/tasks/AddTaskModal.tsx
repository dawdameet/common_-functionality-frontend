"use client";

import React, { useState, useEffect } from "react";
import { X, Calendar as CalendarIcon, User, AlignLeft, Flag, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { useUser } from "../auth/UserContext";

interface AddTaskModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (task: any) => Promise<void>;
    currentUser: any;
}

export function AddTaskModal({ isOpen, onClose, onSave, currentUser }: AddTaskModalProps) {
    const isModerator = currentUser?.role === "moderator";

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [priority, setPriority] = useState<"low" | "medium" | "high">("medium");
    const [deadline, setDeadline] = useState("");
    const [assigneeId, setAssigneeId] = useState(currentUser?.id || "");
    const [teamMembers, setTeamMembers] = useState<any[]>([]);
    const [link, setLink] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const supabase = createClient();
    const today = new Date().toISOString().split("T")[0];

    useEffect(() => {
        if (isOpen && isModerator) {
            // Fetch team members for assignment
            const fetchTeam = async () => {
                const { data } = await supabase.from('profiles').select('id, full_name');
                if (data) setTeamMembers(data);
            };
            fetchTeam();
        }
        if (isOpen) {
            // Default to self assignment if not mod, or prefill self
            if (!assigneeId) setAssigneeId(currentUser?.id);
        }
    }, [isOpen, isModerator]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            await onSave({
                title,
                description,
                priority,
                deadline,
                assignee_id: assigneeId,
                attachment_url: link,
                status: 'todo'
            });
            onClose();
            // Reset form
            setTitle("");
            setDescription("");
            setPriority("medium");
            setDeadline("");
            setLink("");
        } catch (error) {
            console.error(error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-lg bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                    <h2 className="text-lg font-medium text-zinc-900 dark:text-zinc-100">Add New Task</h2>
                    <button onClick={onClose} className="p-1 rounded-md text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 flex flex-col gap-4">
                    {/* Title */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Title</label>
                        <input
                            required
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            placeholder="What needs to be done?"
                            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500/20 outline-none"
                        />
                    </div>

                    {/* Description */}
                    <div className="space-y-1">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5"><AlignLeft className="w-4 h-4 text-zinc-400" /> Description</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Add details..."
                            className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500/20 outline-none min-h-[80px]"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Priority */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5"><Flag className="w-4 h-4 text-zinc-400" /> Priority</label>
                            <div className="flex rounded-lg border border-zinc-300 dark:border-zinc-700 overflow-hidden">
                                {(['low', 'medium', 'high'] as const).map(p => (
                                    <button
                                        key={p}
                                        type="button"
                                        onClick={() => setPriority(p)}
                                        className={cn(
                                            "flex-1 px-2 py-1.5 text-xs font-medium capitalize transition-colors",
                                            priority === p
                                                ? (p === 'high' ? 'bg-red-500 text-white' : p === 'medium' ? 'bg-amber-500 text-white' : 'bg-blue-500 text-white')
                                                : "hover:bg-zinc-50 dark:hover:bg-zinc-800 bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400"
                                        )}
                                    >
                                        {p}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Deadline */}
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5"><CalendarIcon className="w-4 h-4 text-zinc-400" /> Deadline</label>
                            <input
                                type="date"
                                required
                                min={today}
                                value={deadline}
                                onChange={e => setDeadline(e.target.value)}
                                className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500/20 outline-none"
                            />
                        </div>

                        {/* Link (Optional) */}
                        <div className="space-y-1 col-span-2">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5"><ExternalLink className="w-4 h-4 text-zinc-400" /> Link / Attachment</label>
                            <input
                                value={link}
                                onChange={e => setLink(e.target.value)}
                                placeholder="https://..."
                                className="w-full px-3 py-1.5 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500/20 outline-none"
                            />
                        </div>
                    </div>

                    {/* Assignee (Moderator Only) */}
                    {isModerator && (
                        <div className="space-y-1">
                            <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5"><User className="w-4 h-4 text-zinc-400" /> Assign To</label>
                            <select
                                value={assigneeId}
                                onChange={e => setAssigneeId(e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-950 focus:ring-2 focus:ring-blue-500/20 outline-none"
                            >
                                <option value={currentUser.id}>Me ({currentUser.name})</option>
                                {teamMembers.filter(m => m.id !== currentUser.id).map(m => (
                                    <option key={m.id} value={m.id}>{m.full_name}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div className="flex justify-end pt-4 gap-2">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm text-zinc-600 hover:bg-zinc-100 rounded-lg">Cancel</button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 text-sm font-medium text-white bg-zinc-900 dark:bg-zinc-100 dark:text-zinc-900 rounded-lg hover:opacity-90"
                        >
                            {isSubmitting ? "Creating..." : "Create Task"}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
