"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, PenTool, Type, Eraser, Circle, Minus, Palette, X, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Tool = "pen" | "line" | "circle" | "text";
const COLORS = ["#18181b", "#ffffff", "#ef4444", "#3b82f6", "#22c55e", "#a855f7"]; // Zinc-950, White, Red, Blue, Green, Purple

export function Scribblepad() {
  const [content, setContent] = useState("");
  const [mode, setMode] = useState<"text" | "draw">("text"); // Keeps tracking layering mode
  const [activeTool, setActiveTool] = useState<Tool>("pen");
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const startPos = useRef<{ x: number, y: number } | null>(null);
  const snapshot = useRef<ImageData | null>(null);

  // Initialize canvas
  useEffect(() => {
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      const resize = () => {
        const parent = canvas.parentElement;
        if (parent) {
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          tempCtx?.drawImage(canvas, 0, 0);

          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;
          
          if (ctx) {
            ctx.lineCap = "round";
            ctx.lineJoin = "round";
            ctx.lineWidth = 3;
            ctx.drawImage(tempCanvas, 0, 0);
          }
        }
      };
      
      resize();
      window.addEventListener("resize", resize);
      
      // Initial color adaptation for theme
      const isDark = document.documentElement.classList.contains("dark");
      setActiveColor(isDark ? "#ffffff" : "#18181b");

      return () => window.removeEventListener("resize", resize);
    }
  }, []);

  const getPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    const clientX = ('touches' in e) ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
    const clientY = ('touches' in e) ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (mode !== "draw") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    const pos = getPos(e);
    startPos.current = pos;
    snapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);

    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.strokeStyle = activeColor;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || mode !== "draw") return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    
    const currentPos = getPos(e);

    if (activeTool === "pen") {
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.stroke();
    } else {
      // Shape logic: restore snapshot then draw shape
      if (snapshot.current) {
        ctx.putImageData(snapshot.current, 0, 0);
      }
      ctx.beginPath();
      ctx.strokeStyle = activeColor;
      
      if (activeTool === "line" && startPos.current) {
        ctx.moveTo(startPos.current.x, startPos.current.y);
        ctx.lineTo(currentPos.x, currentPos.y);
      } else if (activeTool === "circle" && startPos.current) {
        const radius = Math.sqrt(
          Math.pow(currentPos.x - startPos.current.x, 2) + 
          Math.pow(currentPos.y - startPos.current.y, 2)
        );
        ctx.arc(startPos.current.x, startPos.current.y, radius, 0, 2 * Math.PI);
      }
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    startPos.current = null;
    snapshot.current = null;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleToolSelect = (tool: Tool) => {
    setActiveTool(tool);
    if (tool === "text") {
      setMode("text");
    } else {
      setMode("draw");
    }
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto w-full relative group">
      <div className="flex-1 relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px]">
        {/* Layer 1: Canvas (Bottom) */}
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`absolute inset-0 w-full h-full block touch-none z-10 ${mode === "draw" ? "pointer-events-auto cursor-crosshair" : "pointer-events-none"}`}
        />

        {/* Layer 2: Textarea (Top) */}
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder={mode === "text" ? "Type anywhere..." : ""}
          className={`absolute inset-0 w-full h-full bg-transparent border-none outline-none text-zinc-800 dark:text-zinc-300 text-xl leading-relaxed resize-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:ring-0 p-8 z-20 ${mode === "text" ? "pointer-events-auto" : "pointer-events-none"}`}
          style={{ backgroundColor: 'transparent' }}
        />
        
        {/* Floating Tool Palette */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-4">
          <AnimatePresence>
            {isPaletteOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 p-4 flex flex-col gap-4 mb-2"
              >
                {/* Tools */}
                <div className="flex gap-2 pb-4 border-b border-zinc-100 dark:border-zinc-700">
                  <button
                    onClick={() => handleToolSelect("pen")}
                    className={cn("p-2 rounded-lg transition-colors", activeTool === "pen" ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300")}
                    title="Pen"
                  >
                    <PenTool className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleToolSelect("line")}
                    className={cn("p-2 rounded-lg transition-colors", activeTool === "line" ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300")}
                    title="Line"
                  >
                    <Minus className="w-5 h-5 -rotate-45" />
                  </button>
                  <button
                    onClick={() => handleToolSelect("circle")}
                    className={cn("p-2 rounded-lg transition-colors", activeTool === "circle" ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300")}
                    title="Circle"
                  >
                    <Circle className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => handleToolSelect("text")}
                    className={cn("p-2 rounded-lg transition-colors", activeTool === "text" ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300")}
                    title="Textbox"
                  >
                    <Type className="w-5 h-5" />
                  </button>
                  <div className="w-px bg-zinc-200 dark:bg-zinc-600 mx-1" />
                  <button
                    onClick={clearCanvas}
                    className="p-2 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Clear Canvas"
                  >
                    <Eraser className="w-5 h-5" />
                  </button>
                </div>

                {/* Colors */}
                <div className="flex gap-3 justify-center">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setActiveColor(color)}
                      className={cn(
                        "w-6 h-6 rounded-full border border-zinc-200 dark:border-zinc-700 transition-transform hover:scale-110",
                        activeColor === color && "ring-2 ring-zinc-400 dark:ring-zinc-500 ring-offset-2 dark:ring-offset-zinc-800"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                
                {/* AI Pass Button */}
                <button 
                  onClick={() => alert("Analyzing drawing + text context...")}
                  className="w-full py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg transition-all"
                >
                  <Sparkles className="w-3 h-3" />
                  Pass to AI
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            className="w-14 h-14 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPaletteOpen ? <X className="w-6 h-6" /> : <Palette className="w-6 h-6" />}
          </button>
        </div>
      </div>

      <div className="h-12 flex items-center mt-4">
        <div className="flex gap-6 text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">
          <span>{content.split(/\s+/).filter(Boolean).length} Words</span>
          <span>{mode === "draw" ? "Drawing Mode" : "Text Mode"}</span>
          <span className="text-emerald-500/50">Auto-saved</span>
        </div>
      </div>
    </div>
  );
}
