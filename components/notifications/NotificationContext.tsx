"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";
import { useUser } from "../auth/UserContext";

interface NotificationContextType {
    unreadCounts: { [channelId: string]: number };
    totalUnread: number;
    unreadTasks: number;
    markAsRead: (channelId: string) => Promise<void>;
    markTasksAsRead: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { currentUser } = useUser();
    const [unreadCounts, setUnreadCounts] = useState<{ [channelId: string]: number }>({});
    const [unreadTasks, setUnreadTasks] = useState(0);
    const supabase = createClient();

    // Derived state
    const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

    // Initial Fetch & Realtime
    useEffect(() => {
        if (!currentUser) return;

        const fetchCounts = async () => {
            // Chat counts
            const { data: chatData } = await supabase.rpc('get_unread_counts');
            if (chatData) {
                const counts: any = {};
                chatData.forEach((row: any) => {
                    counts[row.channel_id] = Number(row.unread_count);
                });
                setUnreadCounts(counts);
            }

            // Task count
            const { data: taskCount } = await supabase.rpc('get_unread_tasks_count');
            if (taskCount !== null) {
                setUnreadTasks(Number(taskCount));
            }
        };
        fetchCounts();

        // Subscribe to NEW messages
        const chatChannel = supabase.channel('global_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                const newMsg = payload.new;
                if (newMsg.user_id !== currentUser.id) {
                    setUnreadCounts(prev => ({
                        ...prev,
                        [newMsg.channel_id]: (prev[newMsg.channel_id] || 0) + 1
                    }));
                }
            })
            .subscribe();

        // Subscribe to NEW tasks
        const taskChannel = supabase.channel('global_tasks_notify')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'tasks' }, (payload) => {
                const newTask = payload.new;
                // Increment if assigned to me (realtime check)
                if (newTask.assignee_id === currentUser.id) {
                    setUnreadTasks(prev => prev + 1);
                }
                // Note: Global tasks logic tricky in realtime without joining profiles, 
                // so we rely on assignee or manual refresh for those for now.
            })
            .subscribe();

        return () => {
            supabase.removeChannel(chatChannel);
            supabase.removeChannel(taskChannel);
        };
    }, [currentUser]);

    const markAsRead = async (channelId: string) => {
        if (!unreadCounts[channelId] || unreadCounts[channelId] === 0) {
            // Check
        }

        setUnreadCounts(prev => {
            const next = { ...prev };
            delete next[channelId];
            return next;
        });

        await supabase.from('channel_reads').upsert({
            channel_id: channelId,
            user_id: currentUser.id,
            last_read_at: new Date().toISOString()
        }, { onConflict: 'channel_id,user_id' });
    };

    const markTasksAsRead = async () => {
        if (unreadTasks === 0) return;

        setUnreadTasks(0);
        await supabase.rpc('mark_tasks_viewed');
    };

    return (
        <NotificationContext.Provider value={{ unreadCounts, totalUnread, unreadTasks, markAsRead, markTasksAsRead }}>
            {children}
        </NotificationContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationContext);
    if (context === undefined) {
        throw new Error("useNotifications must be used within a NotificationProvider");
    }
    return context;
}
