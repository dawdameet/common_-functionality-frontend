"use client";

import React, { useEffect, useState } from "react";
import { MessageSquare, AtSign } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/components/notifications/NotificationContext";

export function UnreadChatWidget({ onClick }: { onClick: () => void }) {
  const { unreadMentions } = useNotifications();

  if (unreadMentions === 0) return null;

  return (
    <AnimatePresence>
      <motion.button
        drag
        dragMomentum={false}
        initial={{ scale: 0, opacity: 0, x: 0, y: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0, opacity: 0 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        onClick={onClick}
        className="fixed top-32 right-8 z-[100] w-14 h-14 bg-indigo-600 dark:bg-indigo-500 rounded-full shadow-2xl shadow-indigo-500/30 flex items-center justify-center text-white hover:bg-indigo-700 dark:hover:bg-indigo-400 transition-colors border-2 border-white dark:border-zinc-800 cursor-grab active:cursor-grabbing"
      >
        <AtSign className="w-6 h-6 stroke-[2.5]" />
        <span className="absolute -top-1 -right-1 w-6 h-6 bg-red-500 rounded-full border-2 border-white dark:border-zinc-900 flex items-center justify-center text-[10px] font-bold shadow-sm">
          {unreadMentions > 99 ? '99+' : unreadMentions}
        </span>
      </motion.button>
    </AnimatePresence>
  );
}
