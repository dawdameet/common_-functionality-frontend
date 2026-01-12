"use client";

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles } from "lucide-react";

export function Scribblepad() {
  const [content, setContent] = useState("");
  const [isSubmitVisible, setIsSubmitVisible] = useState(false);

  useEffect(() => {
    setIsSubmitVisible(content.length > 20);
  }, [content]);

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto w-full relative">
      <div className="flex-1 pt-12">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="What's on your mind? This space is private, raw, and safe."
          className="w-full h-full bg-transparent border-none outline-none text-zinc-300 text-xl leading-relaxed resize-none placeholder:text-zinc-800 focus:ring-0"
          autoFocus
        />
      </div>

      <AnimatePresence>
        {isSubmitVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-12 right-0 flex items-center gap-3"
          >
            <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors text-sm border border-zinc-700/50">
              <Sparkles className="w-4 h-4" />
              Analyze with AI
            </button>
            <button 
              className="flex items-center gap-2 px-6 py-2 rounded-full bg-zinc-100 text-zinc-950 hover:bg-white transition-colors text-sm font-medium shadow-xl"
              onClick={() => {
                alert("Submitting to Board for manager review...");
                setContent("");
              }}
            >
              <Send className="w-4 h-4" />
              Submit to Board
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="h-24 flex items-center border-t border-zinc-900 mt-auto">
        <div className="flex gap-6 text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-600">
          <span>{content.split(/\s+/).filter(Boolean).length} Words</span>
          <span>Private Session</span>
          <span className="text-emerald-500/50">Auto-saved</span>
        </div>
      </div>
    </div>
  );
}
