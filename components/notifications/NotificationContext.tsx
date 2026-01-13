"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { createClient } from "@/utils/supabase/client";
import { useUser } from "../auth/UserContext";

interface NotificationContextType {
    unreadCounts: { [channelId: string]: number };
    totalUnread: number;
    markAsRead: (channelId: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
    const { currentUser } = useUser();
    const [unreadCounts, setUnreadCounts] = useState<{ [channelId: string]: number }>({});
    const supabase = createClient();

    // Derived state
    const totalUnread = Object.values(unreadCounts).reduce((a, b) => a + b, 0);

    // Initial Fetch & Realtime
    useEffect(() => {
        if (!currentUser) return;

        const fetchCounts = async () => {
            const { data, error } = await supabase.rpc('get_unread_counts');
            if (data) {
                const counts: any = {};
                data.forEach((row: any) => {
                    counts[row.channel_id] = Number(row.unread_count);
                });
                setUnreadCounts(counts);
            }
        };
        fetchCounts();

        // Subscribe to NEW messages to increment counts
        // Note: This increments even if we are currently looking at the channel. 
        // The View component handles "marking read" immediately if active, 
        // so it might flicker briefly or we handle it by checking active channel.
        // For global context, we just increment. The UI will call markAsRead.
        const channel = supabase.channel('global_messages')
            .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, (payload) => {
                const newMsg = payload.new;
                // Don't count my own messages
                if (newMsg.user_id !== currentUser.id) {
                    setUnreadCounts(prev => ({
                        ...prev,
                        [newMsg.channel_id]: (prev[newMsg.channel_id] || 0) + 1
                    }));
                }
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [currentUser]);

    const markAsRead = async (channelId: string) => {
        // Optimistic update
        if (!unreadCounts[channelId] || unreadCounts[channelId] === 0) {
            // If already 0, maybe just update timestamp on server to be sure, 
            // but for UI strictly we only care if > 0. 
            // Actually, we should always update timestamp to now() so future messages count correctly.
        }

        setUnreadCounts(prev => {
            const next = { ...prev };
            delete next[channelId];
            return next;
        });

        const { error } = await supabase.from('channel_reads').upsert({
            channel_id: channelId,
            user_id: currentUser.id,
            last_read_at: new Date().toISOString()
        }, { onConflict: 'channel_id,user_id' });
    };

    return (
        <NotificationContext.Provider value={{ unreadCounts, totalUnread, markAsRead }}>
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
