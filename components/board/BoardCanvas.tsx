"use client";

import React, { useState, useRef } from "react";
import { Card, CardType } from "./Card";
import { GitPullRequest } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface BoardItem {
  id: string;
  type: CardType;
  title: string;
  content: string;
  x: number;
  y: number;
}

const initialItems: BoardItem[] = [
  {
    id: "1",
    type: "decision",
    title: "Privacy First",
    content: "Thinking is private by default. Reality is curated. Memory is permanent.",
    x: 100,
    y: 100,
  },
  {
    id: "2",
    type: "idea",
    title: "AI as Silent Operator",
    content: "AI never owns ideas or makes final decisions. It observes, summarizes, and connects.",
    x: 450,
    y: 150,
  },
  {
    id: "3",
    type: "constraint",
    title: "V1 Scope Lock",
    content: "No social feeds, no likes/upvotes, no external integrations beyond calendar.",
    x: 200,
    y: 400,
  },
];

export function BoardCanvas() {
  const [items] = useState<BoardItem[]>(initialItems);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrafting, setIsDrafting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "success">("idle");

  const handleSubmit = () => {
    setSubmissionStatus("success");
    setTimeout(() => {
      setIsDrafting(false);
      setSubmissionStatus("idle");
    }, 2000);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden bg-white dark:bg-zinc-950 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px] transition-colors duration-300"
    >
      {/* Zoom Container - Scaled down slightly */}
      <div className="w-full h-full origin-top-left transform scale-90">
        {items.map((item) => (
          <div 
            key={item.id} 
            style={{ 
              position: 'absolute',
              left: item.x,
              top: item.y,
              zIndex: 1
            }}
          >
            <Card 
              id={item.id}
              type={item.type}
              title={item.title}
              content={item.content}
              dragConstraints={containerRef}
            />
          </div>
        ))}
      </div>

      {/* Add Idea Button (PR Style) */}
      <div className="absolute bottom-8 right-8 z-20">
        <button 
          onClick={() => setIsDrafting(true)}
          className="flex items-center gap-2 px-6 py-3 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xl hover:scale-105 transition-transform font-medium"
        >
          <GitPullRequest className="w-4 h-4" />
          <span>Draft Idea (PR)</span>
        </button>
      </div>

      {/* Mock Draft Modal */}
      <AnimatePresence>
        {isDrafting && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-12">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-8 w-full max-w-lg shadow-2xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden"
            >
              {submissionStatus === "success" ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white dark:bg-zinc-900 z-10">
                  <motion.div 
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mb-4"
                  >
                    <GitPullRequest className="w-8 h-8" />
                  </motion.div>
                  <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">Pull Request Created</h3>
                  <p className="text-zinc-500 mt-2">#42 has been submitted for review.</p>
                </div>
              ) : (
                <>
                  <h2 className="text-xl font-semibold mb-6 text-zinc-900 dark:text-zinc-100">Propose New Idea</h2>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs uppercase tracking-wider font-bold text-zinc-500 mb-2">Title</label>
                      <input type="text" className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg px-4 py-2 text-zinc-900 dark:text-zinc-100" placeholder="e.g., Offline Sync Support" />
                    </div>
                    <div>
                      <label className="block text-xs uppercase tracking-wider font-bold text-zinc-500 mb-2">Description</label>
                      <textarea className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-lg px-4 py-2 text-zinc-900 dark:text-zinc-100 h-32 resize-none" placeholder="Describe the value..." />
                    </div>
                    <div className="flex justify-end gap-3 mt-6">
                      <button 
                        onClick={() => setIsDrafting(false)}
                        className="px-4 py-2 rounded-lg text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSubmit}
                        className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700"
                      >
                        Create Pull Request
                      </button>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
