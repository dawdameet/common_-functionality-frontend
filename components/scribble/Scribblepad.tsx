"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, PenTool, Type, Eraser, Circle, Minus, Palette, X, Save, FileDown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tool = "pen" | "line" | "circle" | "text" | "eraser";
const COLORS = ["#18181b", "#ffffff", "#ef4444", "#3b82f6", "#22c55e", "#a855f7"];

interface TextElement {
  id: string;
  x: number;
  y: number;
  text: string;
}

interface SavedScribble {
  id: string;
  timestamp: number;
  canvasData: string;
  textElements: TextElement[];
}

export function Scribblepad() {
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [mode, setMode] = useState<"text" | "draw">("text");
  const [activeTool, setActiveTool] = useState<Tool>("pen");
  const [activeColor, setActiveColor] = useState(COLORS[0]);
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const [savedScribbles, setSavedScribbles] = useState<SavedScribble[]>([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const startPos = useRef<{ x: number, y: number } | null>(null);
  const snapshot = useRef<ImageData | null>(null);

  // Load history from local storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("scribble_history");
    if (saved) {
      try {
        setSavedScribbles(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load history", e);
      }
    }
  }, []);

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
    // If text tool is active, create a new text box
    if (activeTool === "text") {
        const pos = getPos(e);
        const newText: TextElement = {
            id: Date.now().toString(),
            x: pos.x,
            y: pos.y,
            text: ""
        };
        setTextElements(prev => [...prev, newText]);
        // Focus logic could be added here if we had refs to the inputs
        return;
    }

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
    
    if (activeTool === "eraser") {
        ctx.globalCompositeOperation = "destination-out";
        ctx.lineWidth = 20;
    } else {
        ctx.globalCompositeOperation = "source-over";
        ctx.strokeStyle = activeColor;
        ctx.lineWidth = 3;
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canvasRef.current || mode !== "draw") return;
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return;
    
    const currentPos = getPos(e);

    if (activeTool === "pen" || activeTool === "eraser") {
      ctx.lineTo(currentPos.x, currentPos.y);
      ctx.stroke();
    } else {
      if (snapshot.current) {
        ctx.putImageData(snapshot.current, 0, 0);
      }
      ctx.beginPath();
      // Ensure we are drawing in source-over for shapes
      ctx.globalCompositeOperation = "source-over"; 
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
    // Reset composite operation
    if (canvasRef.current) {
        const ctx = canvasRef.current.getContext("2d");
        if (ctx) ctx.globalCompositeOperation = "source-over";
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
    }
    setTextElements([]);
  };

  const handleToolSelect = (tool: Tool) => {
    setActiveTool(tool);
    // Switch modes based on tool
    if (tool === "text") {
        setMode("text"); // Enables pointer events on canvas for clicking to place
    } else {
        setMode("draw");
    }
  };

  const updateText = (id: string, newText: string) => {
    setTextElements(prev => prev.map(t => t.id === id ? { ...t, text: newText } : t));
  };
  
  const removeText = (id: string) => {
      setTextElements(prev => prev.filter(t => t.id !== id));
  }

  const saveScribble = () => {
      if (!canvasRef.current) return;
      const canvasData = canvasRef.current.toDataURL();
      const newSave: SavedScribble = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          canvasData,
          textElements
      };
      const newHistory = [newSave, ...savedScribbles];
      setSavedScribbles(newHistory);
      localStorage.setItem("scribble_history", JSON.stringify(newHistory));
      alert("Scribble saved!");
  };

  const loadScribble = (scribble: SavedScribble) => {
      clearCanvas();
      if (!canvasRef.current) return;
      const ctx = canvasRef.current.getContext("2d");
      const img = new Image();
      img.onload = () => {
          ctx?.drawImage(img, 0, 0);
      };
      img.src = scribble.canvasData;
      setTextElements(scribble.textElements);
      setIsHistoryOpen(false);
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
          className={cn(
            "absolute inset-0 w-full h-full block touch-none z-10",
            activeTool === "text" ? "cursor-text" : "cursor-crosshair"
          )}
        />

        {/* Layer 2: Text Elements (Top) */}
        {textElements.map((el) => (
            <div 
                key={el.id}
                style={{ 
                    position: 'absolute', 
                    left: el.x, 
                    top: el.y,
                    transform: 'translate(-50%, -50%)', // Center on click
                    zIndex: 20 
                }}
            >
                <div className="relative group/text">
                    <textarea 
                        autoFocus
                        value={el.text}
                        onChange={(e) => updateText(el.id, e.target.value)}
                        placeholder="Type..."
                        className="bg-transparent text-zinc-900 dark:text-zinc-100 min-w-[100px] resize-none overflow-hidden outline-none border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 rounded p-1 placeholder:text-zinc-400"
                        style={{
                            height: 'auto',
                            width: `${Math.max(100, el.text.length * 8)}px`
                        }}
                    />
                    <button 
                        onClick={() => removeText(el.id)}
                        className="absolute -top-3 -right-3 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover/text:opacity-100 transition-opacity"
                    >
                        <X className="w-2 h-2" />
                    </button>
                </div>
            </div>
        ))}
        
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
                  <button
                    onClick={() => handleToolSelect("eraser")}
                    className={cn("p-2 rounded-lg transition-colors", activeTool === "eraser" ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300")}
                    title="Eraser"
                  >
                    <Eraser className="w-5 h-5" />
                  </button>
                  <div className="w-px bg-zinc-200 dark:bg-zinc-600 mx-1" />
                  <button
                    onClick={saveScribble}
                    className="p-2 rounded-lg text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 transition-colors"
                    title="Save Scribble"
                  >
                    <Save className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setIsHistoryOpen(!isHistoryOpen)}
                    className="p-2 rounded-lg text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                    title="History"
                  >
                    <FileDown className="w-5 h-5" />
                  </button>
                  <button
                    onClick={clearCanvas}
                    className="p-2 rounded-lg text-red-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    title="Clear Canvas"
                  >
                    <Trash2 className="w-5 h-5" />
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
          
           {/* History Panel */}
           <AnimatePresence>
               {isHistoryOpen && (
                   <motion.div
                       initial={{ opacity: 0, x: 20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: 20 }}
                       className="absolute bottom-20 left-full ml-4 w-64 max-h-96 overflow-y-auto bg-white dark:bg-zinc-800 rounded-2xl shadow-xl border border-zinc-200 dark:border-zinc-700 p-4"
                   >
                       <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 mb-4">Saved Scribbles</h3>
                       <div className="space-y-2">
                           {savedScribbles.length === 0 ? (
                               <p className="text-xs text-zinc-500 text-center py-4">No saved history</p>
                           ) : (
                               savedScribbles.map(scribble => (
                                   <button
                                       key={scribble.id}
                                       onClick={() => loadScribble(scribble)}
                                       className="w-full p-3 text-left bg-zinc-50 dark:bg-zinc-700/50 hover:bg-zinc-100 dark:hover:bg-zinc-700 rounded-xl transition-colors group"
                                   >
                                       <div className="text-xs font-medium text-zinc-700 dark:text-zinc-200">
                                           {new Date(scribble.timestamp).toLocaleDateString()}
                                       </div>
                                       <div className="text-[10px] text-zinc-500 dark:text-zinc-400">
                                           {new Date(scribble.timestamp).toLocaleTimeString()}
                                       </div>
                                   </button>
                               ))
                           )}
                       </div>
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
          <span>{textElements.length} Text Elements</span>
          <span>{activeTool.charAt(0).toUpperCase() + activeTool.slice(1)} Mode</span>
          <span className="text-emerald-500/50">Auto-saved</span>
        </div>
      </div>
    </div>
  );
}