"use client";

import React, { useState, useEffect, useRef } from "react";
import { Play, Pause, RotateCcw, Coffee, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

export function PomodoroTimer() {
    const [timeLeft, setTimeLeft] = useState(25 * 60);
    const [isRunning, setIsRunning] = useState(false);
    const [mode, setMode] = useState<"focus" | "break">("focus");
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (isRunning && timeLeft > 0) {
            timerRef.current = setInterval(() => {
                setTimeLeft((prev) => prev - 1);
            }, 1000);
        } else if (timeLeft === 0) {
            setIsRunning(false);
            // Optional: Sound play here
        }

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRunning, timeLeft]);

    const toggleRun = () => {
        setIsRunning(!isRunning);
    };

    const resetTimer = () => {
        setIsRunning(false);
        setTimeLeft(mode === "focus" ? 25 * 60 : 5 * 60);
    };

    const switchMode = (newMode: "focus" | "break") => {
        setMode(newMode);
        setIsRunning(false);
        setTimeLeft(newMode === "focus" ? 25 * 60 : 5 * 60);
    };

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
    };

    const progress = mode === "focus"
        ? 100 - (timeLeft / (25 * 60)) * 100
        : 100 - (timeLeft / (5 * 60)) * 100;

    return (
        <div className="flex items-center gap-4 bg-zinc-100 dark:bg-zinc-900/50 rounded-xl p-2 border border-zinc-200 dark:border-zinc-800/50">
            <div className="flex items-center gap-2 px-2">
                <button
                    onClick={() => switchMode("focus")}
                    className={cn(
                        "p-2 rounded-lg transition-all",
                        mode === "focus" ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    )}
                    title="Focus Mode"
                >
                    <Brain className="w-4 h-4" />
                </button>
                <button
                    onClick={() => switchMode("break")}
                    className={cn(
                        "p-2 rounded-lg transition-all",
                        mode === "break" ? "bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                    )}
                    title="Break Mode"
                >
                    <Coffee className="w-4 h-4" />
                </button>
            </div>

            <div className="h-8 w-px bg-zinc-200 dark:bg-zinc-800" />

            <div className="flex items-center gap-4 px-2">
                <div className="font-mono text-xl font-medium tabular-nums text-zinc-800 dark:text-zinc-200 w-16 text-center">
                    {formatTime(timeLeft)}
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={toggleRun}
                        className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                    >
                        {isRunning ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button
                        onClick={resetTimer}
                        className="p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400 transition-colors"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Visual Progress Bar (subtle) */}
            <div className="absolute bottom-0 left-0 h-0.5 bg-blue-500/50 transition-all duration-1000 ease-linear" style={{ width: `${progress}%`, opacity: isRunning ? 1 : 0 }} />
        </div>
    );
}
