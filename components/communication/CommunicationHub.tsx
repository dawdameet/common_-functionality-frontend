"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { MessageSquare, Video, FileText, CheckCircle2, HelpCircle } from "lucide-react";

interface Context {
  id: string;
  type: "task" | "board" | "meeting";
  title: string;
  lastMessage: string;
  timestamp: string;
}

const contexts: Context[] = [
  {
    id: "1",
    type: "task",
    title: "Implement core board mechanics",
    lastMessage: "How should we handle the drag-and-drop state?",
    timestamp: "2m ago",
  },
  {
    id: "2",
    type: "meeting",
    title: "V1 Launch Planning",
    lastMessage: "AI extraction complete: 4 new tasks identified.",
    timestamp: "1h ago",
  },
  {
    id: "3",
    type: "board",
    title: "Privacy First (Decision)",
    lastMessage: "Should we add a 'Delete' option for admins?",
    timestamp: "3h ago",
  },
];

export function CommunicationHub() {
  const [activeContext, setActiveContext] = useState(contexts[0]);

  return (
    <div className="flex h-full border border-zinc-200 dark:border-zinc-900 rounded-3xl overflow-hidden bg-white dark:bg-zinc-950/50 backdrop-blur-sm shadow-sm dark:shadow-none">
      {/* Context Sidebar */}
      <div className="w-80 border-r border-zinc-200 dark:border-zinc-900 flex flex-col bg-zinc-50 dark:bg-zinc-950">
        <div className="p-6 border-b border-zinc-200 dark:border-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-200">Contexts</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {contexts.map((context) => (
            <button
              key={context.id}
              onClick={() => setActiveContext(context)}
              className={cn(
                "w-full p-4 flex flex-col gap-1 border-b border-zinc-200 dark:border-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-900/50 transition-colors text-left",
                activeContext.id === context.id && "bg-white dark:bg-zinc-900/80 shadow-sm dark:shadow-none"
              )}
            >
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                  {context.type}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-600">{context.timestamp}</span>
              </div>
              <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-300 line-clamp-1">{context.title}</h4>
              <p className="text-xs text-zinc-500 line-clamp-1 italic">&quot;{context.lastMessage}&quot;</p>
            </button>
          ))}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900/10">
        <header className="p-6 border-b border-zinc-200 dark:border-zinc-900 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-950/50">
          <div>
            <h3 className="text-lg font-medium text-zinc-900 dark:text-zinc-200">{activeContext.title}</h3>
            <p className="text-xs text-zinc-500">Linked to {activeContext.type} #{activeContext.id}</p>
          </div>
          <div className="flex gap-2">
            <button className="p-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition-colors">
              <Video className="w-4 h-4" />
            </button>
          </div>
        </header>

        <div className="flex-1 p-8 overflow-y-auto space-y-8">
          {activeContext.type === "meeting" && (
            <div className="space-y-6">
              <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-800/20 border border-zinc-200 dark:border-zinc-800/50">
                <div className="flex items-center gap-2 mb-4">
                  <FileText className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <h4 className="text-xs uppercase tracking-[0.2em] font-bold text-purple-600 dark:text-purple-400">AI Meeting Extract</h4>
                </div>
                
                <div className="space-y-4">
                  <section>
                    <h5 className="text-[10px] uppercase text-zinc-500 font-bold mb-2">Decisions</h5>
                    <ul className="list-disc list-inside text-sm text-zinc-700 dark:text-zinc-300 space-y-1 ml-2">
                      <li>Launch date set for Jan 25th.</li>
                      <li>Aceternity UI will be the primary component library.</li>
                    </ul>
                  </section>
                  
                  <section>
                    <h5 className="text-[10px] uppercase text-zinc-500 font-bold mb-2">Action Items</h5>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Update Board with new constraints</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Sync with mobile team regarding calendar API</span>
                      </div>
                    </div>
                  </section>

                  <section>
                    <h5 className="text-[10px] uppercase text-zinc-500 font-bold mb-2">Open Questions</h5>
                    <div className="flex items-center gap-2 text-sm text-zinc-700 dark:text-zinc-300">
                      <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                      <span>How do we handle offline scribble syncing?</span>
                    </div>
                  </section>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-4 max-w-2xl">
            <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-800 shrink-0" />
            <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Meet</span>
              <div className="p-4 rounded-2xl rounded-tl-none bg-zinc-100 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 text-sm">
                &quot;{activeContext.lastMessage}&quot;
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 pt-0 mt-auto">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Add to the conversation..."
              className="w-full bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-full px-6 py-3 text-sm text-zinc-800 dark:text-zinc-300 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-700 transition-colors shadow-sm dark:shadow-none"
            />
            <button className="absolute right-2 top-1.5 p-1.5 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-950 hover:opacity-90 transition-opacity">
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}