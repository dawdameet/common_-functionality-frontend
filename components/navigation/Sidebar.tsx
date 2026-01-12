"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  PenTool, 
  CheckSquare, 
  MessageSquare, 
  Sparkles,
  UserCircle
} from "lucide-react";
import { motion } from "framer-motion";
import { ThemeToggle } from "@/components/ThemeToggle";

const navItems = [
  { id: "board", label: "Shared Board", icon: LayoutDashboard },
  { id: "scribble", label: "Scribblepad", icon: PenTool },
  { id: "tasks", label: "Tasks", icon: CheckSquare },
  { id: "comm", label: "Communication", icon: MessageSquare },
  { id: "ai", label: "AI Layer", icon: Sparkles },
];

interface SidebarProps {
  activeTab: string;
  setActiveTab: (id: string) => void;
}

export function Sidebar({ activeTab, setActiveTab }: SidebarProps) {
  return (
    <div className="fixed left-0 top-0 h-full w-16 md:w-20 flex flex-col items-center py-8 bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800/50 z-50 transition-colors duration-300">
      <div className="mb-12">
        <div className="w-8 h-8 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
          <div className="w-4 h-4 bg-zinc-100 dark:bg-zinc-950 rounded-sm rotate-45" />
        </div>
      </div>
      
      <div className="flex flex-col gap-4 flex-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "relative p-3 rounded-xl transition-all duration-300 group",
                isActive 
                  ? "text-zinc-900 dark:text-zinc-100 bg-zinc-100 dark:bg-zinc-800/50" 
                  : "text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900"
              )}
            >
              <Icon className="w-6 h-6" />
              
              {isActive && (
                <motion.div
                  layoutId="sidebar-active"
                  className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-zinc-900 dark:bg-zinc-100 rounded-r-full"
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              
              <div className="absolute left-full ml-4 px-2 py-1 rounded bg-zinc-800 text-zinc-200 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
                {item.label}
              </div>
            </button>
          );
        })}
      </div>
      
      <div className="mt-auto flex flex-col gap-4 items-center mb-4">
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