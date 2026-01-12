"use client";

import * as React from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { cn } from "@/lib/utils";

export function ThemeToggle() {
  const { setTheme, resolvedTheme } = useTheme();

  return (
    <button
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className={cn(
        "relative p-3 rounded-xl transition-all duration-300 group text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-900"
      )}
    >
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute top-3 left-3 h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
      <span className="sr-only">Toggle theme</span>
      
      <div className="absolute left-full ml-4 px-2 py-1 rounded bg-zinc-800 text-zinc-200 text-xs whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity">
        Toggle Theme
      </div>
    </button>
  );
}
