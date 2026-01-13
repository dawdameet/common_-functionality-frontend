"use client";

import React, { useState, useEffect } from "react";
import { useUser, User } from "../auth/UserContext";
import { createClient } from "@/utils/supabase/client";
import { Shield, Briefcase, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

import { AssignTaskModal } from "./AssignTaskModal";

export function TeamSurface() {
    const { currentUser } = useUser();
    const [teamMembers, setTeamMembers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        const fetchTeam = async () => {
            const { data } = await supabase.from("profiles").select("*");
            if (data) {
                setTeamMembers(data.map(p => ({
                    id: p.id,
                    name: p.full_name || "Unknown",
                    email: "", // Profile doesn't have email usually unless joined, but fine
                    role: p.role,
                    avatar: p.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${p.id}`
                })));
            }
        };
        fetchTeam();
    }, []);

    const handleOpenAssignModal = (user: User) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    const handleConfirmAssign = async (data: { title: string; description: string; attachment?: string }) => {
        if (!selectedUser) return;

        const { error } = await supabase.from('tasks').insert({
            title: data.title,
            description: data.description,
            assignee_id: selectedUser.id,
            creator_id: currentUser.id, // Mod ID
            status: 'todo',
            priority: 'medium', // Default
            attachment_url: data.attachment
        });

        if (error) {
            alert("Failed to assign task: " + error.message);
        } else {
            // alert(`Task "${data.title}" assigned to ${selectedUser.name}!`);
            setIsModalOpen(false);
            setSelectedUser(null);
        }
    };

    return (
        <div className="p-4 md:p-12 pb-0 h-full flex flex-col">
            <header className="mb-6 md:mb-12">
                <h1 className="text-zinc-900 dark:text-zinc-100 text-2xl md:text-3xl font-light tracking-tight">Team Structure</h1>
                <p className="text-zinc-500 mt-1 md:mt-2 text-sm md:text-base">Roles and Responsibilities.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamMembers.map((user) => (
                    <div
                        key={user.id}
                        className="flex items-center gap-4 p-4 rounded-xl bg-white dark:bg-zinc-900/50 border border-zinc-200 dark:border-zinc-800"
                    >
                        <div className="relative">
                            <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800" />
                            {user.role === 'moderator' && (
                                <div className="absolute -bottom-1 -right-1 bg-blue-500 text-white p-0.5 rounded-full border-2 border-white dark:border-zinc-900" title="Moderator">
                                    <Shield className="w-3 h-3" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-zinc-900 dark:text-zinc-100 truncate">{user.name}</h3>
                            <p className="text-xs text-zinc-500 capitalize flex items-center gap-1">
                                {user.role === 'moderator' ? <Shield className="w-3 h-3" /> : <Briefcase className="w-3 h-3" />}
                                {user.role}
                            </p>
                        </div>

                        {/* Moderator Action: Assign Task */}
                        {currentUser.role === 'moderator' && currentUser.id !== user.id && (
                            <button
                                onClick={() => handleOpenAssignModal(user)}
                                className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-400 transition-colors"
                                title="Assign Task"
                            >
                                <Plus className="w-4 h-4" />
                            </button>
                        )}
                    </div>
                ))}
            </div>

            <AssignTaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onAssign={handleConfirmAssign}
                assigneeName={selectedUser?.name || "Member"}
            />
        </div>
    );
}
