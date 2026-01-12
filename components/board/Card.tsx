"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export type CardType = "idea" | "decision" | "constraint" | "summary";

interface CardProps {
  id: string;
  type: CardType;
  title: string;
  content: string;
  className?: string;
  dragConstraints?: React.RefObject<Element | null>;
}

const typeStyles: Record<CardType, string> = {
  idea: "border-blue-500/30 bg-blue-500/5 text-blue-900 dark:text-blue-100",
  decision: "border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-100",
  constraint: "border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-100",
  summary: "border-purple-500/30 bg-purple-500/5 text-purple-900 dark:text-purple-100",
};

const typeLabels: Record<CardType, string> = {
  idea: "Idea",
  decision: "Decision",
  constraint: "Constraint",
  summary: "Meeting Summary",
};

export function Card({ type, title, content, className, dragConstraints }: CardProps) {
  return (
    <motion.div
      drag
      dragConstraints={dragConstraints}
      dragMomentum={false}
      className={cn(
        "absolute p-6 rounded-2xl border w-72 shadow-2xl cursor-grab active:cursor-grabbing backdrop-blur-sm",
        typeStyles[type],
        className
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">
            {typeLabels[type]}
          </span>
          <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
        </div>
        
        <h3 className="text-lg font-medium leading-tight">{title}</h3>
        <p className="text-sm opacity-70 leading-relaxed line-clamp-4">{content}</p>
        
        <div className="mt-2 pt-4 border-t border-current opacity-10 flex justify-between items-center">
          <span className="text-[10px]">v1.0</span>
          <span className="text-[10px]">JAN 12</span>
        </div>
      </div>
    </motion.div>
  );
}
