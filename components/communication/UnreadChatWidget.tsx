"use client";

import React, { useEffect, useState } from "react";
import { MessageSquare } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/components/notifications/NotificationContext";
import { createClient } from "@/utils/supabase/client";

export function UnreadChatWidget({ onClick }: { onClick: () => void }) {
  const { unreadCounts } = useNotifications();
  const [generalChannelId, setGeneralChannelId] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    const fetchChannels = async () => {
      // Find the 'general' channel (case-insensitive)
      const { data } = await supabase
        .from('channels')
        .select('id, name')
        .ilike('name', 'general')
        .maybeSingle();
      
      if (data) {
        setGeneralChannelId(data.id);
      }
    };
    fetchChannels();
  }, []);

  // Calculate meaningful unread count (excluding General)
  const meaningfulUnreadCount = Object.entries(unreadCounts).reduce((acc, [channelId, count]) => {
    // If we haven't found general channel ID yet, we might show it briefly? 
    // Better to assume if we don't know, we show it? Or wait? 
    // Usually General exists. If generalChannelId is null, we count everything. 
    // But to be safe and avoid flashing, maybe we should wait? 
    // Actually, if generalChannelId is null (fetching or not found), let's count it. 
    // But once found, exclude it.
    if (generalChannelId && channelId === generalChannelId) return acc;
    return acc + count;
  }, 0);

  if (meaningfulUnreadCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className="fixed bottom-6 left-24 z-[100] w-12 h-12 bg-blue-600 dark:bg-blue-500 rounded-full shadow-2xl shadow-blue-500/30 flex items-center justify-center text-white hover:bg-blue-700 dark:hover:bg-blue-400 transition-colors border-2 border-white dark:border-zinc-800"
      >
        <MessageSquare className="w-5 h-5 fill-current" />
        <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-bold shadow-sm">
          {meaningfulUnreadCount > 99 ? '99+' : meaningfulUnreadCount}
        </span>
      </motion.button>
    </AnimatePresence>
  );
}
