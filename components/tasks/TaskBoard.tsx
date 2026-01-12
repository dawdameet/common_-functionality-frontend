"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { Calendar, User, Link as LinkIcon } from "lucide-react";

interface Task {
  id: string;
  title: string;
  status: "todo" | "in-progress" | "done";
  priority: "low" | "medium" | "high";
  owner: string;
  deadline: string;
  origin: string;
}

const tasks: Task[] = [
  {
    id: "1",
    title: "Implement core board mechanics",
    status: "in-progress",
    priority: "high",
    owner: "Meet",
    deadline: "Jan 15",
    origin: "V1 Roadmap",
  },
  {
    id: "2",
    title: "Draft privacy policy for scribblepad",
    status: "todo",
    priority: "medium",
    owner: "Meet",
    deadline: "Jan 20",
    origin: "Legal Constraint",
  },
];

const columns = [
  { id: "todo", label: "To Do" },
  { id: "in-progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

export function TaskBoard() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full overflow-hidden">
      {columns.map((column) => (
        <div key={column.id} className="flex flex-col gap-6 h-full">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">
              {column.label}
            </h3>
            <span className="text-[10px] bg-zinc-900 text-zinc-600 px-2 py-0.5 rounded-full border border-zinc-800">
              {tasks.filter((t) => t.status === column.id).length}
            </span>
          </div>
          
          <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
            {tasks
              .filter((task) => task.status === column.id)
              .map((task) => (
                <div 
                  key={task.id}
                  className="group p-5 rounded-2xl bg-zinc-900/40 border border-zinc-800/50 hover:border-zinc-700/50 transition-all cursor-pointer"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <h4 className="text-zinc-200 font-medium leading-tight group-hover:text-zinc-100 transition-colors">
                        {task.title}
                      </h4>
                      <div className={cn(
                        "w-1.5 h-1.5 rounded-full",
                        task.priority === 'high' ? 'bg-red-500/50' : 
                        task.priority === 'medium' ? 'bg-amber-500/50' : 'bg-zinc-500/50'
                      )} />
                    </div>
                    
                    <div className="flex flex-wrap gap-4 items-center mt-2">
                      <div className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
                        <User className="w-3 h-3" />
                        <span>{task.owner}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
                        <Calendar className="w-3 h-3" />
                        <span>{task.deadline}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-zinc-400 text-[10px] ml-auto font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                        <LinkIcon className="w-3 h-3" />
                        <span>{task.origin}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
            <button className="py-4 rounded-2xl border border-dashed border-zinc-800/50 text-zinc-600 text-xs hover:border-zinc-700 hover:text-zinc-500 transition-all flex items-center justify-center gap-2">
              <span>+ Add Task</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
