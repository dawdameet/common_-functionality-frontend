"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Sparkles, AlertCircle, Zap, Brain, Activity } from "lucide-react";

export function AILayer() {
  return (
    <div className="h-full flex flex-col gap-8 max-w-5xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Observational Feed */}
        <div className="flex flex-col gap-6">
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 flex items-center gap-2">
            <Activity className="w-3 h-3" />
            Active Observations
          </h3>
          
          <div className="space-y-4">
            {[
              {
                id: 1,
                type: "connection",
                text: "Scribble #42 links to 'Privacy First' decision on Board.",
                icon: Brain,
                color: "text-blue-400"
              },
              {
                id: 2,
                type: "risk",
                text: "Deadline for 'Core Board Mechanics' is approaching (3 days). Progress is 40%.",
                icon: AlertCircle,
                color: "text-amber-400"
              },
              {
                id: 3,
                type: "suggestion",
                text: "Found 3 related papers on 'Psychological Safety in Software' for your current scribble.",
                icon: Sparkles,
                color: "text-purple-400"
              }
            ].map((obs) => (
              <div key={obs.id} className="p-4 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 flex gap-4 items-start">
                <div className={cn("mt-1 shrink-0", obs.color)}>
                  <obs.icon className="w-4 h-4" />
                </div>
                <p className="text-sm text-zinc-300 leading-relaxed">{obs.text}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Actionable Intelligence */}
        <div className="flex flex-col gap-6">
          <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500 flex items-center gap-2">
            <Zap className="w-3 h-3" />
            Actionable Suggestions
          </h3>
          
          <div className="space-y-6">
            <div className="p-6 rounded-2xl bg-zinc-100 text-zinc-950 shadow-xl">
              <h4 className="text-sm font-bold mb-2">Daily Execution Plan</h4>
              <p className="text-xs text-zinc-700 mb-4 italic">Optimized for deep work and high-priority tasks.</p>
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-950" />
                  <span>09:00 - 11:30: Focus on Board Mechanics</span>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-400" />
                  <span>11:30 - 12:00: Review AI extracted tasks</span>
                </div>
              </div>
              <button className="mt-6 w-full py-2 bg-zinc-950 text-white rounded-lg text-xs font-medium hover:bg-zinc-800 transition-colors">
                Apply to Calendar
              </button>
            </div>

            <div className="p-6 rounded-2xl border border-dashed border-zinc-800 flex flex-col items-center justify-center text-center py-12">
              <Sparkles className="w-8 h-8 text-zinc-700 mb-4" />
              <p className="text-sm text-zinc-500 max-w-[200px]">AI is silently observing your thinking. It will speak when it finds a connection.</p>
            </div>
          </div>
        </div>
      </div>
      
      {/* Memory Status */}
      <div className="mt-auto p-6 rounded-2xl border border-zinc-900 bg-zinc-950/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex -space-x-1">
            {[1, 2, 3].map((i) => (
              <div key={i} className="w-6 h-6 rounded-full bg-zinc-800 border-2 border-zinc-950" />
            ))}
          </div>
          <p className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
            Syncing Long-term Memory Across 3 Nodes
          </p>
        </div>
        <div className="h-1.5 w-32 bg-zinc-900 rounded-full overflow-hidden">
          <div className="h-full w-2/3 bg-emerald-500/50" />
        </div>
      </div>
    </div>
  );
}
