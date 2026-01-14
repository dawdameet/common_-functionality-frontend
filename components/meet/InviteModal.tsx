"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { X, UserPlus, Check } from "lucide-react";
import { User } from "../auth/UserContext";

interface InviteModalProps {
    isOpen: boolean;
    onClose: () => void;
    currentUserId: string;
}

export function InviteModal({ isOpen, onClose, currentUserId }: InviteModalProps) {
    const [users, setUsers] = useState<any[]>([]);
    const [invited, setInvited] = useState<Set<string>>(new Set());
    const supabase = createClient();

    useEffect(() => {
        if (isOpen) {
            const fetchUsers = async () => {
                const { data } = await supabase.from("profiles").select("*");
                if (data) {
                    setUsers(data.filter(u => u.id !== currentUserId));
                }
            };
            fetchUsers();
        }
    }, [isOpen, currentUserId]);

    const handleInvite = async (userId: string) => {
        // In a real app, this would insert into a 'notifications' table.
        // For V1, we'll simulate or assume a table exists.
        // Let's create a notification table if not exists via SQL or just Log it.
        // Since we can't easily create tables on the fly without SQL file execution, 
        // we will check if 'notifications' exists, else we'll just console log.
        // Wait! We can use the 'tasks' as a hacky notification? No.
        // Let's assume we just trigger a toast or console for V1, 
        // OR better: Create a "Meeting Invite" task assigned to them?
        // That's a clever hack for "No extra tables".
        // "Please join meeting [Link]"
        
        // Let's use the Task System as the Notification System.
        const currentUrl = window.location.href;
        const { error } = await supabase.from("tasks").insert({
            title: "Meeting Invite",
            description: `Please join the meeting: ${currentUrl}`,
            assignee_id: userId,
            priority: 'high',
            status: 'todo'
        });

        if (!error) {
            setInvited(prev => new Set(prev).add(userId));
        } else {
            console.error("Failed to invite", error);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden">
                <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
                    <h3 className="text-white font-medium">Invite People</h3>
                    <button onClick={onClose} className="text-zinc-400 hover:text-white"><X size={18} /></button>
                </div>
                <div className="max-h-[300px] overflow-y-auto p-2">
                    {users.map(user => (
                        <div key={user.id} className="flex items-center justify-between p-2 hover:bg-zinc-800 rounded-lg">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                                    {user.full_name?.[0] || "?"}
                                </div>
                                <div>
                                    <p className="text-sm text-zinc-200">{user.full_name}</p>
                                    <p className="text-xs text-zinc-500">{user.role}</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => handleInvite(user.id)}
                                disabled={invited.has(user.id)}
                                className={`p-2 rounded-full transition-colors ${invited.has(user.id) ? 'bg-green-500/20 text-green-500' : 'bg-zinc-700 text-zinc-300 hover:bg-indigo-600 hover:text-white'}`}
                            >
                                {invited.has(user.id) ? <Check size={16} /> : <UserPlus size={16} />}
                            </button>
                        </div>
                    ))}
                    {users.length === 0 && <p className="text-center text-zinc-500 py-4 text-sm">No other users found.</p>}
                </div>
            </div>
        </div>
    );
}
