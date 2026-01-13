"use client";

import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { Calendar, User, Link as LinkIcon } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "done";
  priority: "low" | "medium" | "high";
  assignee?: {
    full_name: string;
    avatar_url?: string;
  };
  deadline?: string;
  origin_board_item_id?: string;
  created_at: string;
}

const columns = [
  { id: "todo", label: "To Do" },
  { id: "in_progress", label: "In Progress" },
  { id: "done", label: "Done" },
];

export function TaskBoard() {
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const supabase = createClient();

  useEffect(() => {
    const fetchTasks = async () => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*, assignee:profiles!assignee_id(full_name, avatar_url)');

      if (data) {
        setTasks(data as any);
      }
    };
    fetchTasks();

    const channel = supabase.channel('tasks_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, (payload: RealtimePostgresChangesPayload<any>) => {
        // For simplicity, just re-fetch to get the join data correctly. 
        // Optimizing later if needed.
        fetchTasks();
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    e.dataTransfer.setData("taskId", taskId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, status: string) => {
    const taskId = e.dataTransfer.getData("taskId");
    if (!taskId) return;

    // Optimistic
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, status: status as any } : t));

    await supabase.from('tasks').update({ status }).eq('id', taskId);
  };
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 h-full overflow-hidden">
      {columns.map((column) => (
        <div
          key={column.id}
          className="flex flex-col gap-6 h-full"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">
              {column.label}
            </h3>
            <span className="text-[10px] bg-zinc-100 dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 px-2 py-0.5 rounded-full border border-zinc-200 dark:border-zinc-800">
              {tasks.filter((t) => t.status === column.id).length}
            </span>
          </div>

          <div className="flex-1 flex flex-col gap-4 overflow-y-auto pr-2 custom-scrollbar">
            {tasks
              .filter((task) => task.status === column.id)
              .map((task) => (
                <div
                  key={task.id}
                  draggable
                  onDragStart={(e) => handleDragStart(e, task.id)}
                  className="group p-5 rounded-2xl bg-white dark:bg-zinc-900/40 border border-zinc-200 dark:border-zinc-800/50 hover:border-zinc-300 dark:hover:border-zinc-700/50 transition-all cursor-grab active:cursor-grabbing shadow-sm dark:shadow-none"
                >
                  <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start">
                      <h4 className="text-zinc-800 dark:text-zinc-200 font-medium leading-tight group-hover:text-zinc-900 dark:group-hover:text-zinc-100 transition-colors">
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
                        {task.assignee?.avatar_url ? (
                          <img src={task.assignee.avatar_url} className="w-4 h-4 rounded-full" />
                        ) : (
                          <User className="w-3 h-3" />
                        )}
                        <span>{task.assignee?.full_name || "Unassigned"}</span>
                      </div>
                      {task.deadline && (
                        <div className="flex items-center gap-1.5 text-zinc-500 text-[10px]">
                          <Calendar className="w-3 h-3" />
                          <span>{new Date(task.deadline).toLocaleDateString()}</span>
                        </div>
                      )}
                      {task.origin_board_item_id && (
                        <div className="flex items-center gap-1.5 text-zinc-400 dark:text-zinc-500 text-[10px] ml-auto font-mono opacity-0 group-hover:opacity-100 transition-opacity">
                          <LinkIcon className="w-3 h-3" />
                          <span>Linked</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}

            <button className="py-4 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-800/50 text-zinc-500 dark:text-zinc-600 text-xs hover:border-zinc-400 dark:hover:border-zinc-700 hover:text-zinc-600 dark:hover:text-zinc-500 transition-all flex items-center justify-center gap-2">
              <span>+ Add Task</span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}