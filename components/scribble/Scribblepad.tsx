"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Sparkles, PenTool, Type, Eraser, Circle, Minus, Palette, X, Save, FileDown, Trash2, Edit2, GripVertical, FolderOpen, Image as ImageIcon } from "lucide-react";
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
  title: string;
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
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const startPos = useRef<{ x: number, y: number } | null>(null);
  const snapshot = useRef<ImageData | null>(null);

  // Dragging logic for textboxes
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const dragOffset = useRef<{ x: number, y: number } | null>(null);

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
    if (tool === "text") {
        setMode("text"); 
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

  const startDragging = (e: React.MouseEvent | React.TouchEvent, id: string) => {
    e.stopPropagation();
    const pos = getPos(e as any); // Type cast simplified for brevity
    const el = textElements.find(t => t.id === id);
    if (el) {
        setDraggingId(id);
        dragOffset.current = { x: pos.x - el.x, y: pos.y - el.y };
    }
  };

  const onDragMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (draggingId && dragOffset.current) {
          const pos = getPos(e as any);
          setTextElements(prev => prev.map(t => 
              t.id === draggingId 
              ? { ...t, x: pos.x - dragOffset.current!.x, y: pos.y - dragOffset.current!.y } 
              : t
          ));
      }
  };

  const stopDragging = () => {
      setDraggingId(null);
      dragOffset.current = null;
  };

  const saveScribble = () => {
      if (!canvasRef.current) return;
      const canvasData = canvasRef.current.toDataURL();
      const newSave: SavedScribble = {
          id: Date.now().toString(),
          title: `Untitled Scribble ${savedScribbles.length + 1}`,
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

  const updateScribbleTitle = (id: string, newTitle: string) => {
      const updated = savedScribbles.map(s => s.id === id ? { ...s, title: newTitle } : s);
      setSavedScribbles(updated);
      localStorage.setItem("scribble_history", JSON.stringify(updated));
  };
  
  const deleteScribble = (e: React.MouseEvent, id: string) => {
      e.stopPropagation();
      if(confirm("Are you sure you want to delete this scribble?")) {
        const updated = savedScribbles.filter(s => s.id !== id);
        setSavedScribbles(updated);
        localStorage.setItem("scribble_history", JSON.stringify(updated));
      }
  };

  return (
    <div 
        className="h-full flex flex-col max-w-4xl mx-auto w-full relative group"
        onMouseMove={(e) => {
            if (draggingId) onDragMove(e);
        }}
        onMouseUp={stopDragging}
        onTouchMove={(e) => {
            if (draggingId) onDragMove(e);
        }}
        onTouchEnd={stopDragging}
    >
        {/* Top Header Bar */}
        <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 flex items-center gap-3">
               <span>Scribblepad</span>
               <button 
                  onClick={() => setIsHistoryOpen(true)}
                  className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors flex items-center gap-2 text-sm text-zinc-600 dark:text-zinc-300"
               >
                   <FolderOpen className="w-4 h-4" />
                   <span>My Scribbles</span>
               </button>
            </h2>
            <div className="flex items-center gap-2">
                 <div className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-xs font-medium border border-emerald-500/20">
                     {savedScribbles.length} Saved
                 </div>
            </div>
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
                    transform: 'translate(-50%, -50%)', 
                    zIndex: 30 
                }}
            >
                <div className="relative group/text">
                    <div 
                        className="absolute -left-3 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover/text:opacity-100 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-opacity"
                        onMouseDown={(e) => startDragging(e, el.id)}
                        onTouchStart={(e) => startDragging(e, el.id)}
                    >
                        <GripVertical className="w-4 h-4" />
                    </div>

                    <textarea 
                        autoFocus
                        value={el.text}
                        onChange={(e) => updateText(el.id, e.target.value)}
                        placeholder="Type..."
                        className="bg-transparent text-zinc-900 dark:text-zinc-100 min-w-[100px] resize-none overflow-hidden outline-none border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 rounded p-1 placeholder:text-zinc-400 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm"
                        style={{
                            height: 'auto',
                            width: `${Math.max(100, el.text.length * 8 + 20)}px`
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

          <button
            onClick={() => setIsPaletteOpen(!isPaletteOpen)}
            className="w-14 h-14 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-full shadow-xl flex items-center justify-center hover:scale-105 transition-transform"
          >
            {isPaletteOpen ? <X className="w-6 h-6" /> : <Palette className="w-6 h-6" />}
          </button>
        </div>
      </div>
      
       {/* Scribbles Modal */}
       <AnimatePresence>
           {isHistoryOpen && (
               <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                   <motion.div
                       initial={{ opacity: 0, scale: 0.95 }}
                       animate={{ opacity: 1, scale: 1 }}
                       exit={{ opacity: 0, scale: 0.95 }}
                       className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-4xl h-[80vh] shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden"
                   >
                       <div className="p-6 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                           <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">My Saved Scribbles</h2>
                           <button onClick={() => setIsHistoryOpen(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg">
                               <X className="w-5 h-5 text-zinc-500" />
                           </button>
                       </div>
                       
                       <div className="flex-1 overflow-y-auto p-6 grid grid-cols-2 md:grid-cols-3 gap-6">
                           {savedScribbles.length === 0 ? (
                               <div className="col-span-full flex flex-col items-center justify-center text-zinc-500 py-12">
                                   <FileDown className="w-12 h-12 mb-4 opacity-50" />
                                   <p>No saved scribbles yet.</p>
                               </div>
                           ) : (
                               savedScribbles.map(scribble => (
                                   <div key={scribble.id} className="group relative aspect-video bg-zinc-100 dark:bg-zinc-800 rounded-xl overflow-hidden border border-zinc-200 dark:border-zinc-700 hover:ring-2 hover:ring-blue-500 transition-all cursor-pointer">
                                       <img src={scribble.canvasData} className="w-full h-full object-contain p-4" alt="Scribble preview" onClick={() => loadScribble(scribble)} />
                                       
                                       <div className="absolute top-0 left-0 w-full p-2 bg-gradient-to-b from-black/50 to-transparent flex justify-between items-start opacity-0 group-hover:opacity-100 transition-opacity">
                                           <div className="flex-1 mr-2">
                                               {editingTitleId === scribble.id ? (
                                                   <input 
                                                       autoFocus
                                                       type="text" 
                                                       defaultValue={scribble.title} 
                                                       className="w-full bg-white/90 text-black text-xs px-2 py-1 rounded outline-none"
                                                       onBlur={(e) => {
                                                           updateScribbleTitle(scribble.id, e.target.value);
                                                           setEditingTitleId(null);
                                                       }}
                                                       onKeyDown={(e) => {
                                                           if(e.key === 'Enter') {
                                                               updateScribbleTitle(scribble.id, e.currentTarget.value);
                                                               setEditingTitleId(null);
                                                           }
                                                       }}
                                                        onClick={(e) => e.stopPropagation()}
                                                   />
                                               ) : (
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-white text-xs font-medium truncate drop-shadow-md">{scribble.title}</span>
                                                        <button 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setEditingTitleId(scribble.id);
                                                            }}
                                                            className="p-1 hover:bg-white/20 rounded text-white"
                                                        >
                                                            <Edit2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                               )}
                                           </div>
                                            <button 
                                                onClick={(e) => deleteScribble(e, scribble.id)}
                                                className="p-1.5 bg-red-500/80 hover:bg-red-500 text-white rounded shadow-lg"
                                            >
                                                <Trash2 className="w-3 h-3" />
                                            </button>
                                       </div>
                                       
                                       <div className="absolute bottom-0 left-0 w-full p-2 bg-gradient-to-t from-black/60 to-transparent text-[10px] text-zinc-300 text-right">
                                           {new Date(scribble.timestamp).toLocaleDateString()}
                                       </div>
                                   </div>
                               ))
                           )}
                       </div>
                   </motion.div>
               </div>
           )}
       </AnimatePresence>

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
