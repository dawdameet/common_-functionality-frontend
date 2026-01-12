"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Check, Trash2 } from "lucide-react";

export type CardType = "idea" | "decision" | "constraint" | "summary" | "note";

interface CardProps {
  id: string;
  type: CardType;
  title: string;
  content: string;
  className?: string;
  dragConstraints?: React.RefObject<Element | null>;
  customColor?: string;
  isEditable?: boolean;
  onUpdate?: (id: string, updates: { title?: string; content?: string; customColor?: string }) => void;
  onDelete?: (id: string) => void;
}

const typeStyles: Record<CardType, string> = {
  idea: "border-blue-500/30 bg-blue-500/5 text-blue-900 dark:text-blue-100",
  decision: "border-emerald-500/30 bg-emerald-500/5 text-emerald-900 dark:text-emerald-100",
  constraint: "border-amber-500/30 bg-amber-500/5 text-amber-900 dark:text-amber-100",
  summary: "border-purple-500/30 bg-purple-500/5 text-purple-900 dark:text-purple-100",
  note: "border-zinc-200 dark:border-zinc-700 bg-white/80 dark:bg-zinc-800/80 text-zinc-900 dark:text-zinc-100",
};

const typeLabels: Record<CardType, string> = {
  idea: "Idea",
  decision: "Decision",
  constraint: "Constraint",
  summary: "Meeting Summary",
  note: "Note",
};

// Pastels matching the Shared Board themes
const NOTE_COLORS = [
  "#ffffff", // White
  "#fffbeb", // Amber-50 (Constraint)
  "#ecfdf5", // Emerald-50 (Decision)
  "#eff6ff", // Blue-50 (Idea)
  "#faf5ff", // Purple-50 (Summary)
  "#fdf2f8", // Pink-50
];

export function Card({ 
  id, 
  type, 
  title, 
  content, 
  className, 
  dragConstraints, 
  customColor, 
  isEditable,
  onUpdate,
  onDelete
}: CardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(title);
  const [editContent, setEditContent] = useState(content);
  const [editColor, setEditColor] = useState(customColor);

  const handleDoubleClick = () => {
    if (isEditable) setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    onUpdate?.(id, { 
      title: editTitle, 
      content: editContent, 
      customColor: editColor 
    });
  };

  const handleDelete = () => {
    if (confirm("Are you sure you want to delete this note?")) {
      onDelete?.(id);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      handleSave();
    }
  };

  return (
    <motion.div
      drag
      dragConstraints={dragConstraints}
      dragMomentum={false}
      onDoubleClick={handleDoubleClick}
      onKeyDown={handleKeyDown}
      className={cn(
        "absolute p-6 rounded-2xl border w-72 shadow-xl cursor-grab active:cursor-grabbing backdrop-blur-xl transition-colors group",
        !customColor && typeStyles[type],
        // If custom color is set, force dark text for readability on pastels
        customColor && "text-zinc-900 border-zinc-200/50",
        className
      )}
      style={customColor ? { backgroundColor: customColor } : undefined}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {isEditing ? (
        <div className="flex flex-col gap-3 h-full relative" onPointerDown={(e) => e.stopPropagation()}>
          <input
            autoFocus
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-lg font-medium leading-tight bg-transparent border-b border-black/10 outline-none w-full placeholder:text-zinc-400"
            placeholder="Title"
          />
          <textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="text-sm opacity-90 leading-relaxed bg-transparent outline-none w-full resize-none h-32 placeholder:text-zinc-400"
            placeholder="Write something..."
          />
          
          <div className="flex gap-1.5 flex-wrap mt-2">
            {NOTE_COLORS.map(color => (
              <button
                key={color}
                onClick={() => setEditColor(color)}
                className={cn(
                  "w-6 h-6 rounded-full border border-black/10 shadow-sm transition-transform hover:scale-110",
                  editColor === color && "ring-2 ring-black/20 ring-offset-1"
                )}
                style={{ backgroundColor: color }}
              />
            ))}
          </div>

          <button 
            onClick={handleDelete}
            className="absolute -bottom-2 left-0 p-2 text-red-500 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            title="Delete Note"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button 
            onClick={handleSave}
            className="absolute -bottom-2 -right-2 p-2 bg-zinc-900 text-white rounded-full shadow-lg hover:bg-zinc-800"
          >
            <Check className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest font-bold opacity-60">
              {typeLabels[type]}
            </span>
            <div className="w-1.5 h-1.5 rounded-full bg-current opacity-40" />
          </div>
          
          <h3 className="text-lg font-medium leading-tight">{title}</h3>
          <p className="text-sm opacity-70 leading-relaxed line-clamp-4 whitespace-pre-wrap">{content}</p>
          
          <div className="mt-2 pt-4 border-t border-current opacity-10 flex justify-between items-center">
            <span className="text-[10px]">v1.0</span>
            <span className="text-[10px]">JAN 12</span>
          </div>
        </div>
      )}
    </motion.div>
  );
}
