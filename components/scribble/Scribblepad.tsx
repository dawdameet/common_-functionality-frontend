"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, PenTool, Type, Eraser } from "lucide-react";

export function Scribblepad() {
  const [content, setContent] = useState("");
  const [isSubmitVisible, setIsSubmitVisible] = useState(false);
  const [mode, setMode] = useState<"text" | "draw">("text");
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Initialize canvas
  useEffect(() => {
    // Always initialize canvas logic if reference exists
    if (canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      
      const resize = () => {
        const parent = canvas.parentElement;
        if (parent) {
          // Save content
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          tempCtx?.drawImage(canvas, 0, 0);

          canvas.width = parent.clientWidth;
          canvas.height = parent.clientHeight;
          
          // Restore content
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
      return () => window.removeEventListener("resize", resize);
    }
  }, []); // Run once on mount

  useEffect(() => {
    setIsSubmitVisible(content.length > 20);
  }, [content]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (mode !== "draw") return; // Only draw when in draw mode
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    setIsDrawing(true);
    
    const rect = canvas.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = document.documentElement.classList.contains("dark") ? "#e4e4e7" : "#18181b";
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || mode !== "draw") return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    
    const rect = canvasRef.current.getBoundingClientRect();
    const x = ('touches' in e) ? e.touches[0].clientX - rect.left : (e as React.MouseEvent).clientX - rect.left;
    const y = ('touches' in e) ? e.touches[0].clientY - rect.top : (e as React.MouseEvent).clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  return (
    <div className="h-full flex flex-col max-w-4xl mx-auto w-full relative">
      <div className="flex justify-between items-center mb-6">
        <div className="flex bg-zinc-100 dark:bg-zinc-800 rounded-lg p-1">
          <button
            onClick={() => setMode("text")}
            className={`p-2 rounded-md transition-all ${mode === "text" ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
          >
            <Type className="w-4 h-4" />
          </button>
          <button
            onClick={() => setMode("draw")}
            className={`p-2 rounded-md transition-all ${mode === "draw" ? "bg-white dark:bg-zinc-700 shadow-sm text-zinc-900 dark:text-zinc-100" : "text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"}`}
          >
            <PenTool className="w-4 h-4" />
          </button>
        </div>
        
        {mode === "draw" && (
           <button 
             onClick={clearCanvas}
             className="text-zinc-500 hover:text-red-500 transition-colors flex items-center gap-2 text-xs uppercase font-bold tracking-wider"
           >
             <Eraser className="w-4 h-4" /> Clear
           </button>
        )}
      </div>

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
          placeholder="What's on your mind? This space is private, raw, and safe."
          className={`absolute inset-0 w-full h-full bg-transparent border-none outline-none text-zinc-800 dark:text-zinc-300 text-xl leading-relaxed resize-none placeholder:text-zinc-400 dark:placeholder:text-zinc-600 focus:ring-0 p-8 z-20 ${mode === "text" ? "pointer-events-auto" : "pointer-events-none"}`}
          style={{ 
             // Ensure text doesn't obscure canvas visually, only by occupying space
             backgroundColor: 'transparent'
          }}
        />
      </div>

      <AnimatePresence>
        {isSubmitVisible && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-12 right-0 flex items-center gap-3 z-30"
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

      <div className="h-12 flex items-center mt-4">
        <div className="flex gap-6 text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">
          <span>{content.split(/\s+/).filter(Boolean).length} Words</span>
          <span>Private Session</span>
          <span className="text-emerald-500/50">Auto-saved</span>
        </div>
      </div>
    </div>
  );
}