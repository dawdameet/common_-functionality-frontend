"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PenTool,
  CheckSquare,
  MessageSquare,
  Sparkles,
  UserCircle,
  Calendar,
  Users
} from "lucide-react";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useNotifications } from "../notifications/NotificationContext";

const navItems = [
  { id: "board", label: "Shared Board", icon: LayoutDashboard },
  { id: "scribble", label: "Scribblepad", icon: PenTool },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "comm", label: "Communication", icon: MessageSquare },
  // { id: "ai", label: "AI Layer", icon: Sparkles }, // V1 Scope Change
  { id: "team", label: "Team", icon: Users },
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  const { totalUnread, unreadTasks } = useNotifications();
  return (
    <div className="fixed bottom-0 left-0 w-full h-16 md:h-full md:w-20 md:top-0 flex flex-row md:flex-col items-center justify-between md:justify-start px-4 md:px-0 py-2 md:py-8 bg-white dark:bg-zinc-950 border-t md:border-t-0 md:border-r border-zinc-200 dark:border-zinc-800/50 z-50 transition-colors duration-300">
      <div className="hidden md:block md:mb-12">
        <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center overflow-hidden">
             <img src="/logo.png" alt="Logo" className="w-full h-full object-cover" />
        </div>
      </div>

      <div className="flex flex-row md:flex-col gap-1 md:gap-4 flex-1 justify-around md:justify-start w-full md:w-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "relative p-2 md:p-3 rounded-xl transition-all duration-300 group",
                isActive
                  ? "text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800/50"
                  : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              )}
            >
              <Icon className="w-5 h-5 md:w-6 md:h-6" />
              {item.id === "comm" && totalUnread > 0 && activeTab !== "comm" && (
                <span className="absolute top-2 right-2 md:top-2 md:right-2 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white dark:border-zinc-950 animate-pulse" />
              )}
              {item.id === "tasks" && unreadTasks > 0 && activeTab !== "tasks" && (
                <span className="absolute top-2 right-2 md:top-2 md:right-2 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-white dark:border-zinc-950 animate-pulse" />
              )}

              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute bottom-0 md:bottom-auto md:left-0 md:top-1/4 left-1/4 right-1/4 h-1 md:h-auto md:w-1 md:right-auto bg-zinc-900 dark:bg-zinc-100 rounded-t-full md:rounded-r-full md:rounded-tl-none"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}

              <div className="hidden md:block absolute left-full ml-4 px-2 py-1 rounded bg-zinc-800 text-zinc-200 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                {item.label}
              </div>
            </button>
          );
        })}
      </div>

      <div className="hidden md:flex flex-col gap-4 items-center mb-4">
        <ThemeToggle />
        <button
          onClick={() => setActiveTab("profile")}
          className={cn(
            "w-8 h-8 rounded-full bg-zinc-800 overflow-hidden border border-zinc-700 flex items-center justify-center transition-all hover:scale-105",
            activeTab === "profile" ? "ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-2" : ""
          )}
        >
          {/* Placeholder for user avatar */}
          <UserCircle className="w-full h-full text-zinc-400" />
        </button>
      </div>
    </div>
  );
}