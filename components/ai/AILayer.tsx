"use client";

import React, { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Sparkles, AlertCircle, Zap, Brain, Activity, SendHorizontal, Bot } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
  id: string;
  role: "user" | "ai";
  content: string;
  timestamp: Date;
}

export function AILayer() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "ai",
      content: "I'm observing your board and scribblepad. I'll flag contradictions or suggest connections here. You can also ask me directly.",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = () => {
    if (!inputValue.trim()) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputValue,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInputValue("");

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        role: "ai",
        content: "I've noted that. I'm cross-referencing this with your latest board decisions regarding 'Privacy First'.",
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className="h-full flex flex-col gap-8 max-w-5xl mx-auto w-full">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 flex-1 min-h-0">
        {/* Observational Feed */}
        <div className="flex flex-col gap-6 h-full min-h-0 overflow-y-auto pr-2 custom-scrollbar">
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 flex items-center gap-2 sticky top-0 bg-white dark:bg-zinc-950 py-2 z-10">
            <Activity className="w-3 h-3" />
            Active Observations
          </h3>
          
          <div className="space-y-4 pb-4">
            {[
              {
                id: 1,
                type: "connection",
                text: "Scribble #42 links to 'Privacy First' decision on Board.",
                icon: Brain,
                color: "text-blue-500 dark:text-blue-400"
              },
              {
                id: 2,
                type: "risk",
                text: "Deadline for 'Core Board Mechanics' is approaching (3 days). Progress is 40%.",
                icon: AlertCircle,
                color: "text-amber-500 dark:text-amber-400"
              },
              {
                id: 3,
                type: "suggestion",
                text: "Found 3 related papers on 'Psychological Safety in Software' for your current scribble.",
                icon: Sparkles,
                color: "text-purple-500 dark:text-purple-400"
              }
            ].map((obs) => (
              <div key={obs.id} className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/50 flex gap-4 items-start">
                <div className={cn("mt-1 shrink-0", obs.color)}>
                  <obs.icon className="w-4 h-4" />
                </div>
                <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{obs.text}</p>
              </div>
            ))}
          </div>

          <div className="mt-auto">
             <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 flex items-center gap-2 mb-4">
                <Zap className="w-3 h-3" />
                Actionable Suggestions
              </h3>
              
              <div className="p-6 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-950 shadow-xl">
                <h4 className="text-sm font-bold mb-2">Daily Execution Plan</h4>
                <p className="text-xs text-zinc-400 dark:text-zinc-700 mb-4 italic">Optimized for deep work and high-priority tasks.</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-white dark:bg-zinc-950" />
                    <span>09:00 - 11:30: Focus on Board Mechanics</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-zinc-500 dark:bg-zinc-400" />
                    <span>11:30 - 12:00: Review AI extracted tasks</span>
                  </div>
                </div>
                <button className="mt-6 w-full py-2 bg-white dark:bg-zinc-950 text-zinc-900 dark:text-white rounded-lg text-xs font-medium hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                  Apply to Calendar
                </button>
              </div>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex flex-col h-full bg-zinc-50 dark:bg-zinc-900/20 border border-zinc-200 dark:border-zinc-800/50 rounded-3xl overflow-hidden">
          <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-2 bg-white dark:bg-zinc-900">
            <Bot className="w-4 h-4 text-purple-500" />
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">System Intelligence</span>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
            {messages.map((msg) => (
              <div 
                key={msg.id} 
                className={cn(
                  "flex gap-3 max-w-[90%]",
                  msg.role === "user" ? "ml-auto flex-row-reverse" : ""
                )}
              >
                <div className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center shrink-0",
                  msg.role === "ai" ? "bg-purple-100 dark:bg-purple-900/30 text-purple-600" : "bg-zinc-200 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-200"
                )}>
                  {msg.role === "ai" ? <Sparkles className="w-4 h-4" /> : <div className="w-4 h-4 rounded-sm bg-current rotate-45" />}
                </div>
                <div className={cn(
                  "p-3 rounded-2xl text-sm leading-relaxed",
                  msg.role === "ai" 
                    ? "bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-tl-none" 
                    : "bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 rounded-tr-none shadow-md"
                )}>
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
            <div className="relative flex items-center">
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Ask AI about connections or data..."
                className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-full px-4 py-3 text-sm text-zinc-900 dark:text-zinc-100 focus:ring-2 focus:ring-purple-500/50 outline-none pr-12"
              />
              <button 
                onClick={handleSendMessage}
                className="absolute right-2 p-1.5 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
              >
                <SendHorizontal className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
      
      {/* Memory Status */}
      <div className="mt-auto p-6 rounded-2xl border border-zinc-200 dark:border-zinc-900 bg-zinc-50 dark:bg-zinc-950/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex -space-x-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-800 border-2 border-white dark:border-zinc-950" />
            ))}
          </div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
            Syncing Long-term Memory Across 3 Nodes
          </p>
        </div>
        <div className="h-1.5 w-32 bg-zinc-200 dark:bg-zinc-900 rounded-full overflow-hidden">
          <div className="h-full w-2/3 bg-emerald-500/50" />
        </div>
      </div>
    </div>
  );
}
