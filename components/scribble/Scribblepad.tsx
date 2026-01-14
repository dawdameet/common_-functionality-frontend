"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { PenTool, Type, Eraser, Circle, Minus, Palette, X, Save, FileDown, Trash2, Edit2, GripVertical, FolderOpen, Sparkles, CheckCircle2, Info, AlertTriangle, Hand } from "lucide-react";
import { cn } from "@/lib/utils";
import NextImage from "next/image";
import { useTheme } from "next-themes";
import { createClient } from "@/utils/supabase/client";

type Tool = "pen" | "line" | "circle" | "text" | "eraser" | "hand";
const COLORS = ["#18181b", "#ffffff", "#ef4444", "#3b82f6", "#22c55e", "#a855f7"];

interface TextElement {
  id: string;
  x: number;
  y: number;
  text: string;
}

interface ShapeElement {
  id: string;
  type: "line" | "circle";
  x: number;
  y: number;
  endX: number;
  endY: number;
  color: string;
}

interface Point {
    x: number;
    y: number;
}

interface Stroke {
    id: string;
    points: Point[];
    color: string;
    width: number;
    tool: "pen" | "eraser";
}

interface ImageElement {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  data: string; // Data URL
}

interface SavedScribble {
  id: string;
  title: string;
  timestamp: number;
  canvasData: string; 
  textElements: TextElement[];
  shapeElements: ShapeElement[];
  imageElements?: ImageElement[];
  strokes?: Stroke[];
}

interface Notification {
  show: boolean;
  title: string;
  message: string;
  type: "success" | "info";
}

interface Confirmation {
  show: boolean;
  id: string | null;
}

export function Scribblepad() {
  const { resolvedTheme } = useTheme();
  const supabase = createClient();
  
  // State
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [shapeElements, setShapeElements] = useState<ShapeElement[]>([]);
  const [imageElements, setImageElements] = useState<ImageElement[]>([]);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null);
  
  // Cache for loaded images
  const loadedImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const [activeTool, setActiveTool] = useState<Tool>("pen");
  const [manualColor, setManualColor] = useState<string | null>(null);
  const activeColor = manualColor ?? (resolvedTheme === "dark" ? "#ffffff" : "#18181b");
  
  const [isPaletteOpen, setIsPaletteOpen] = useState(false);
  const paletteRef = useRef<HTMLDivElement>(null);
  
  // History State
  const [savedScribbles, setSavedScribbles] = useState<SavedScribble[]>([]);

  // Fetch from Supabase
  useEffect(() => {
    const fetchScribbles = async () => {
        const { data, error } = await supabase
            .from('scribbles')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) {
            console.error("Error fetching scribbles:", error);
            return;
        }

        if (data) {
            const mapped: SavedScribble[] = data.map(row => {
                const content = row.content;
                // Handle Meeting Snapshots
                if (content.type === 'meeting_snapshot' && content.boardData) {
                    const boardData = content.boardData;
                    const newStrokes: Stroke[] = [];
                    const newTexts: TextElement[] = [];
                    const newShapes: ShapeElement[] = [];
                    const newImages: ImageElement[] = [];

                    boardData.forEach((obj: any) => {
                        if (obj.type === 'path') {
                            newStrokes.push({
                                id: obj.id,
                                points: obj.data.map((p: number[]) => ({ x: p[0], y: p[1] })),
                                color: obj.color,
                                width: 3,
                                tool: 'pen'
                            });
                        } else if (obj.type === 'text') {
                            newTexts.push({
                                id: obj.id,
                                x: obj.x,
                                y: obj.y,
                                text: obj.data
                            });
                        } else if (obj.type === 'circle') {
                            newShapes.push({
                                id: obj.id,
                                type: 'circle',
                                x: obj.x - obj.data.r,
                                y: obj.y - obj.data.r,
                                endX: obj.x + obj.data.r,
                                endY: obj.y + obj.data.r,
                                color: obj.color
                            });
                        } else if (obj.type === 'image') {
                            newImages.push({
                                id: obj.id,
                                x: obj.x,
                                y: obj.y,
                                width: obj.width || 200,
                                height: obj.height || 200,
                                data: obj.data
                            });
                        }
                    });

                    return {
                        id: row.id,
                        title: content.title || "Meeting Note",
                        timestamp: new Date(row.created_at).getTime(),
                        canvasData: "", 
                        textElements: newTexts,
                        shapeElements: newShapes,
                        imageElements: newImages,
                        strokes: newStrokes
                    };
                }
                
                return {
                     id: row.id,
                     title: content.title || "Untitled",
                     timestamp: new Date(row.created_at).getTime(),
                     canvasData: content.canvasData || "",
                     textElements: content.textElements || [],
                     shapeElements: content.shapeElements || [],
                     imageElements: content.imageElements || [],
                     strokes: content.strokes || []
                };
            });
            setSavedScribbles(mapped);
        }
    };
    
    fetchScribbles();
  }, []);

  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  
  const [notification, setNotification] = useState<Notification>({ show: false, title: "", message: "", type: "success" });
  const [confirmation, setConfirmation] = useState<Confirmation>({ show: false, id: null });
  
  // Canvas & Interaction State
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isSpacePressed, setIsSpacePressed] = useState(false);
  const [previewShape, setPreviewShape] = useState<ShapeElement | null>(null);
  
  // Infinite Canvas State
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  // Refs for drawing loop (to avoid closure staleness without re-renders)
  const currentStrokeRef = useRef<Point[]>([]);
  const startPos = useRef<{ x: number, y: number } | null>(null); // Screen coords for shapes
  const lastPointerPos = useRef<{ x: number, y: number } | null>(null); // Screen coords for panning

  const [draggedElementId, setDraggedElementId] = useState<string | null>(null);
  const [draggedElementType, setDraggedElementType] = useState<"text" | "shape" | null>(null);
  const dragOffset = useRef<{ x: number, y: number } | null>(null);

  // --- Helpers defined early to avoid hoisting issues ---

  const showNotification = useCallback((title: string, message: string, type: "success" | "info" = "success") => {
    setNotification({ show: true, title, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 1500);
  }, []);

  const renderCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      // Clear Screen
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Apply Transform
      ctx.setTransform(zoom, 0, 0, zoom, pan.x, pan.y);

      // Draw Background Image (Legacy Support)
      if (backgroundImage) {
          ctx.drawImage(backgroundImage, 0, 0);
      }

      // Draw Image Elements
      imageElements.forEach(imgEl => {
          if (loadedImagesRef.current.has(imgEl.data)) {
              const img = loadedImagesRef.current.get(imgEl.data)!;
              ctx.drawImage(img, imgEl.x, imgEl.y, imgEl.width, imgEl.height);
          } else {
              const img = new Image();
              img.onload = () => {
                  loadedImagesRef.current.set(imgEl.data, img);
                  renderCanvas();
              };
              img.src = imgEl.data;
          }
      });

      // Draw Strokes
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      strokes.forEach(stroke => {
          if (stroke.points.length < 2) return;
          
          ctx.beginPath();
          ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
          for (let i = 1; i < stroke.points.length; i++) {
              ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
          }

          if (stroke.tool === "eraser") {
              ctx.globalCompositeOperation = "destination-out";
              ctx.lineWidth = stroke.width;
          } else {
              ctx.globalCompositeOperation = "source-over";
              ctx.strokeStyle = stroke.color;
              ctx.lineWidth = stroke.width;
          }
          ctx.stroke();
      });
      
      // Draw Current Stroke (if any)
      if (isDrawing && currentStrokeRef.current.length > 0 && (activeTool === 'pen' || activeTool === 'eraser')) {
          const points = currentStrokeRef.current;
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          for (let i = 1; i < points.length; i++) {
              ctx.lineTo(points[i].x, points[i].y);
          }
          
          if (activeTool === "eraser") {
              ctx.globalCompositeOperation = "destination-out";
              ctx.lineWidth = 20;
          } else {
              ctx.globalCompositeOperation = "source-over";
              ctx.strokeStyle = activeColor;
              ctx.lineWidth = 3 / zoom; // Maintain world width
              ctx.lineWidth = 3; 
          }
          ctx.stroke();
      }
  }, [strokes, pan, zoom, backgroundImage, isDrawing, activeTool, activeColor]);

  // --- Effects ---

  // Handle Spacebar for Pan Mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !e.repeat && !(e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement)) {
        setIsSpacePressed(true);
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space") {
        setIsSpacePressed(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    return () => {
        window.removeEventListener("keydown", handleKeyDown);
        window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Resize Handler
  useEffect(() => {
    const handleResize = () => {
        if (canvasRef.current && canvasRef.current.parentElement) {
            canvasRef.current.width = canvasRef.current.parentElement.clientWidth;
            canvasRef.current.height = canvasRef.current.parentElement.clientHeight;
            renderCanvas();
        }
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, [renderCanvas]);

  // Trigger render on changes
  useEffect(() => {
      renderCanvas();
  }, [renderCanvas]);

  // Handle outside click for palette
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        setIsPaletteOpen(false);
      }
    }
    if (isPaletteOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isPaletteOpen]);

  // --- Interaction Logic ---

  // Coordinate Mapping
  const getScreenPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent | React.PointerEvent) => {
    if (!canvasRef.current) return { x: 0, y: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    let clientX = 0;
    let clientY = 0;
    
    // Check for touches first for backward compatibility if needed, though PointerEvent handles most
    if ('touches' in e && (e as unknown as TouchEvent).touches.length > 0) {
        clientX = (e as unknown as TouchEvent).touches[0].clientX;
        clientY = (e as unknown as TouchEvent).touches[0].clientY;
    } else {
        clientX = (e as MouseEvent | React.PointerEvent).clientX;
        clientY = (e as MouseEvent | React.PointerEvent).clientY;
    }
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const getWorldPos = (e: React.MouseEvent | React.TouchEvent | MouseEvent | TouchEvent | React.PointerEvent) => {
      const screenPos = getScreenPos(e);
      return {
          x: (screenPos.x - pan.x) / zoom,
          y: (screenPos.y - pan.y) / zoom
      };
  };

  // Input Handlers
  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const zoomSensitivity = 0.001;
        const delta = -e.deltaY * zoomSensitivity;
        const newZoom = Math.min(Math.max(0.1, zoom + delta), 5);
        
        // Zoom towards pointer
        const rect = canvasRef.current?.getBoundingClientRect();
        if (rect) {
            const mouseX = e.clientX - rect.left;
            const mouseY = e.clientY - rect.top;
            
            // Calculate world point under mouse before zoom
            const worldX = (mouseX - pan.x) / zoom;
            const worldY = (mouseY - pan.y) / zoom;
            
            // Calculate new pan to keep world point under mouse
            const newPanX = mouseX - worldX * newZoom;
            const newPanY = mouseY - worldY * newZoom;
            
            setZoom(newZoom);
            setPan({ x: newPanX, y: newPanY });
        }
    } else {
        // Pan
        setPan(prev => ({ x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const handlePointerDown = (e: React.PointerEvent) => {
      // If touching palette or other UI, don't draw
      if ((e.target as HTMLElement).closest('button, input, textarea')) return;
      
      (e.target as Element).setPointerCapture(e.pointerId);

      setIsPaletteOpen(false);
      const screenPos = getScreenPos(e);
      const worldPos = getWorldPos(e);

      // Check if we are Panning
      if (activeTool === "hand" || isSpacePressed || (activeTool === 'pen' && e.button === 1)) {
          setIsDragging(true);
          lastPointerPos.current = screenPos;
          return;
      }

      // Check Tools
      if (activeTool === "text") {
          const newText: TextElement = {
              id: crypto.randomUUID(),
              x: worldPos.x,
              y: worldPos.y,
              text: ""
          };
          setTextElements(prev => [...prev, newText]);
          setActiveTool("pen"); 
          return;
      }

      // Start Drawing / Shape
      setIsDrawing(true);
      startPos.current = worldPos;
      
      if (activeTool === "pen" || activeTool === "eraser") {
          currentStrokeRef.current = [worldPos];
          renderCanvas();
      }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const screenPos = getScreenPos(e);
    
    // Panning
    if (isDragging && lastPointerPos.current) {
        const deltaX = screenPos.x - lastPointerPos.current.x;
        const deltaY = screenPos.y - lastPointerPos.current.y;
        setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
        lastPointerPos.current = screenPos;
        return;
    }

    // Dragging Elements
    if (draggedElementId && dragOffset.current) {
         const worldPos = getWorldPos(e);
         if (draggedElementType === "text") {
             setTextElements(prev => prev.map(t => 
                 t.id === draggedElementId ? { ...t, x: worldPos.x - dragOffset.current!.x, y: worldPos.y - dragOffset.current!.y } : t
             ));
         } else if (draggedElementType === "shape") {
             setShapeElements(prev => prev.map(s => {
                 if (s.id !== draggedElementId) return s;
                 const width = s.endX - s.x;
                 const height = s.endY - s.y;
                 const newX = worldPos.x - dragOffset.current!.x;
                 const newY = worldPos.y - dragOffset.current!.y;
                 return { ...s, x: newX, y: newY, endX: newX + width, endY: newY + height };
             }));
         }
         return;
    }

    if (!isDrawing) return;

    const worldPos = getWorldPos(e);

    if (activeTool === "pen" || activeTool === "eraser") {
        currentStrokeRef.current.push(worldPos);
        renderCanvas(); 
    } else if (activeTool === "line" || activeTool === "circle") {
        setPreviewShape({
            id: "preview",
            type: activeTool,
            x: startPos.current!.x,
            y: startPos.current!.y,
            endX: worldPos.x,
            endY: worldPos.y,
            color: activeColor
        });
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
      (e.target as Element).releasePointerCapture(e.pointerId);

      if (isDragging) {
          setIsDragging(false);
          lastPointerPos.current = null;
      }

      if (draggedElementId) {
          setDraggedElementId(null);
          setDraggedElementType(null);
          dragOffset.current = null;
      }

      if (isDrawing) {
          if (activeTool === "pen" || activeTool === "eraser") {
              if (currentStrokeRef.current.length > 0) {
                  const newStroke: Stroke = {
                      id: crypto.randomUUID(),
                      points: currentStrokeRef.current,
                      color: activeTool === "eraser" ? "#000000" : activeColor, 
                      width: activeTool === "eraser" ? 20 : 3,
                      tool: activeTool
                  };
                  setStrokes(prev => [...prev, newStroke]);
              }
              currentStrokeRef.current = [];
          } else if ((activeTool === "line" || activeTool === "circle") && previewShape) {
              setShapeElements(prev => [...prev, { ...previewShape, id: crypto.randomUUID() }]);
              setPreviewShape(null);
          }
          
          setIsDrawing(false);
          startPos.current = null;
      }
  };

  // Other Actions
  const clearCanvas = () => {
    setStrokes([]);
    setTextElements([]);
    setShapeElements([]);
    setBackgroundImage(null);
    renderCanvas();
  };

  const handleToolSelect = (tool: Tool) => {
    setActiveTool(tool);
  };

  const updateText = (id: string, newText: string) => {
    setTextElements(prev => prev.map(t => t.id === id ? { ...t, text: newText } : t));
  };
  
  const removeText = (id: string) => {
      setTextElements(prev => prev.filter(t => t.id !== id));
  };

  const removeShape = (id: string) => {
      setShapeElements(prev => prev.filter(s => s.id !== id));
  };

  const startDraggingElement = (e: React.MouseEvent | React.TouchEvent, id: string, type: "text" | "shape") => {
    e.stopPropagation();
    const worldPos = getWorldPos(e); 
    
    let el;
    if (type === "text") {
        el = textElements.find(t => t.id === id);
    } else {
        el = shapeElements.find(s => s.id === id);
    }

    if (el) {
        setDraggedElementId(id);
        setDraggedElementType(type);
        dragOffset.current = { x: worldPos.x - el.x, y: worldPos.y - el.y };
    }
  };

  // Persistence
  const saveScribble = useCallback(() => {
      if (!canvasRef.current) return;
      // Thumbnail
      const canvasData = canvasRef.current.toDataURL();
      
      const newSave: SavedScribble = {
          id: crypto.randomUUID(),
          title: `Untitled Scribble ${savedScribbles.length + 1}`,
          timestamp: Date.now(),
          canvasData,
          textElements,
          shapeElements,
          imageElements,
          strokes
      };
      const newHistory = [newSave, ...savedScribbles];
      setSavedScribbles(newHistory);
      localStorage.setItem("scribble_history", JSON.stringify(newHistory));
      showNotification("Saved", "Scribble saved to history.", "success");
  }, [savedScribbles, textElements, shapeElements, strokes, showNotification]);

  const loadScribble = (scribble: SavedScribble) => {
      clearCanvas();
      
      setTextElements(scribble.textElements);
      setShapeElements(scribble.shapeElements || []);
      setImageElements(scribble.imageElements || []);
      setStrokes(scribble.strokes || []);

      if ((!scribble.strokes || scribble.strokes.length === 0) && scribble.canvasData) {
          const img = new Image();
          img.onload = () => {
              setBackgroundImage(img);
          };
          img.src = scribble.canvasData;
      }

      setIsHistoryOpen(false);
      setPan({ x: 0, y: 0 });
      setZoom(1);
  };

  const updateScribbleTitle = (id: string, newTitle: string) => {
      const updated = savedScribbles.map(s => s.id === id ? { ...s, title: newTitle } : s);
      setSavedScribbles(updated);
      localStorage.setItem("scribble_history", JSON.stringify(updated));
  };
  
  const confirmDelete = (id: string) => {
      setConfirmation({ show: true, id });
  };

  const executeDelete = () => {
      if (confirmation.id) {
        const updated = savedScribbles.filter(s => s.id !== confirmation.id);
        setSavedScribbles(updated);
        localStorage.setItem("scribble_history", JSON.stringify(updated));
      }
      setConfirmation({ show: false, id: null });
  };
  

  return (
    <div 
        className="h-full flex flex-col max-w-4xl mx-auto w-full relative group select-none"
    >
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

      <div className="flex-1 relative rounded-2xl overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        
        {/* Infinite Background Grid */}
        <div 
            className="absolute inset-0 w-full h-full pointer-events-none bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)]"
            style={{
                backgroundPosition: `${pan.x}px ${pan.y}px`,
                backgroundSize: `${20 * zoom}px ${20 * zoom}px`
            }}
        />

        {/* Interaction Wrapper */}
        <div 
            className={cn(
                "absolute inset-0 w-full h-full touch-none outline-none",
                activeTool === "hand" || isSpacePressed ? "cursor-grab active:cursor-grabbing" : 
                activeTool === "text" ? "cursor-text" : "cursor-crosshair"
            )}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
        >
             {/* Drawing Canvas */}
            <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full block pointer-events-none"
            />

            {/* SVG Layer for Shapes */}
            <div 
                className="absolute inset-0 w-full h-full pointer-events-none origin-top-left"
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            >
                <svg className="overflow-visible w-full h-full">
                    {shapeElements.map(shape => (
                        <g key={shape.id} className="pointer-events-auto group cursor-grab active:cursor-grabbing"
                            onMouseDown={(e) => startDraggingElement(e, shape.id, "shape")}
                            onTouchStart={(e) => startDraggingElement(e, shape.id, "shape")}
                        >
                            {shape.type === "line" && (
                                <line 
                                    x1={shape.x} y1={shape.y} x2={shape.endX} y2={shape.endY} 
                                    stroke={shape.color} strokeWidth="3" strokeLinecap="round"
                                    className="hover:stroke-blue-400"
                                />
                            )}
                            {shape.type === "circle" && (
                                <circle 
                                    cx={shape.x + (shape.endX - shape.x)/2} 
                                    cy={shape.y + (shape.endY - shape.y)/2} 
                                    r={Math.sqrt(Math.pow(shape.endX - shape.x, 2) + Math.pow(shape.endY - shape.y, 2)) / 2} 
                                    stroke={shape.color} strokeWidth="3" fill="transparent"
                                    className="hover:stroke-blue-400"
                                />
                            )}
                            <foreignObject x={shape.endX} y={shape.endY} width="20" height="20" className="opacity-0 group-hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); removeShape(shape.id); }}
                                    className="bg-red-500 text-white rounded-full p-1 cursor-pointer"
                                >
                                    <X className="w-3 h-3" />
                                </button>
                            </foreignObject>
                        </g>
                    ))}

                    {previewShape && (
                        <>
                            {previewShape.type === "line" && (
                                <line 
                                    x1={previewShape.x} y1={previewShape.y} x2={previewShape.endX} y2={previewShape.endY} 
                                    stroke={previewShape.color} strokeWidth="3" strokeLinecap="round" opacity="0.5"
                                />
                            )}
                            {previewShape.type === "circle" && (
                                <circle 
                                    cx={previewShape.x + (previewShape.endX - previewShape.x)/2} 
                                    cy={previewShape.y + (previewShape.endY - previewShape.y)/2} 
                                    r={Math.sqrt(Math.pow(previewShape.endX - previewShape.x, 2) + Math.pow(previewShape.endY - previewShape.y, 2)) / 2} 
                                    stroke={previewShape.color} strokeWidth="3" fill="transparent" opacity="0.5"
                                />
                            )}
                        </>
                    )}
                </svg>
            </div>

            {/* DOM Layer for Text */}
            <div 
                className="absolute inset-0 w-full h-full pointer-events-none origin-top-left"
                style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            >
                 {textElements.map((el) => (
                    <div 
                        key={el.id}
                        className="pointer-events-auto"
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
                                className="absolute -left-4 top-1/2 -translate-y-1/2 cursor-grab active:cursor-grabbing p-1 opacity-0 group-hover/text:opacity-100 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 transition-opacity"
                                onMouseDown={(e) => startDraggingElement(e, el.id, "text")}
                                onTouchStart={(e) => startDraggingElement(e, el.id, "text")}
                            >
                                <GripVertical className="w-4 h-4" />
                            </div>

                            <textarea 
                                autoFocus
                                value={el.text}
                                onChange={(e) => updateText(el.id, e.target.value)}
                                onKeyDown={(e) => e.stopPropagation()} // Allow typing space without panning
                                placeholder="Type..."
                                className="bg-transparent text-zinc-900 dark:text-zinc-100 min-w-[100px] resize-none overflow-hidden outline-none border border-transparent hover:border-zinc-300 dark:hover:border-zinc-700 rounded p-1 placeholder:text-zinc-400 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm"
                                style={{
                                    height: 'auto',
                                    width: `${Math.max(100, el.text.length * 8 + 20)}px`
                                }}
                            />
                            <button 
                                onClick={() => removeText(el.id)}
                                className="absolute -top-3 -right-3 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover/text:opacity-100 transition-opacity cursor-pointer"
                            >
                                <X className="w-2 h-2" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </div>
        
        {/* Palette */}
        <div ref={paletteRef} className="absolute bottom-8 left-1/2 -translate-x-1/2 z-40 flex flex-col items-center gap-4">
          <AnimatePresence>
            {isPaletteOpen && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                className="bg-white dark:bg-zinc-800 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-700 p-4 flex flex-col gap-4 mb-2"
              >
                <div className="flex gap-2 pb-4 border-b border-zinc-100 dark:border-zinc-700">
                  <button
                    onClick={() => handleToolSelect("hand")}
                    className={cn("p-2 rounded-lg transition-colors", activeTool === "hand" ? "bg-zinc-100 dark:bg-zinc-700 text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300")}
                    title="Pan Tool (Space+Drag)"
                  >
                    <Hand className="w-5 h-5" />
                  </button>
                  <div className="w-px bg-zinc-200 dark:bg-zinc-600 mx-1" />
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

                <div className="flex gap-3 justify-center">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setManualColor(color)}
                      className={cn(
                        "w-6 h-6 rounded-full border border-zinc-200 dark:border-zinc-700 transition-transform hover:scale-110",
                        activeColor === color && "ring-2 ring-zinc-400 dark:ring-zinc-500 ring-offset-2 dark:ring-offset-zinc-800"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
                
                <button 
                  onClick={() => showNotification("Analyzing...", "Sending drawing context to AI (Mock)", "info")}
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
      
       {/* History Modal */}
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
                                       <NextImage 
                                            src={scribble.canvasData} 
                                            alt="Scribble preview" 
                                            fill
                                            className="object-contain p-4" 
                                            onClick={() => loadScribble(scribble)}
                                            unoptimized
                                       />
                                       
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
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    confirmDelete(scribble.id);
                                                }}
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

       <AnimatePresence>
           {notification.show && (
             <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none">
                 <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-sm w-full pointer-events-auto flex flex-col items-center text-center"
                 >
                     <div className={cn(
                        "w-12 h-12 rounded-full flex items-center justify-center mb-4",
                        notification.type === "success" ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400" : "bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400"
                     )}>
                         {notification.type === "success" ? <CheckCircle2 className="w-6 h-6" /> : <Info className="w-6 h-6" />}
                     </div>
                     <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-1">{notification.title}</h3>
                     <p className="text-zinc-500 dark:text-zinc-400 text-sm">{notification.message}</p>
                 </motion.div>
             </div>
           )}
       </AnimatePresence>

       <AnimatePresence>
           {confirmation.show && (
             <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                 <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-6 max-w-sm w-full flex flex-col items-center text-center"
                 >
                     <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center mb-4">
                         <AlertTriangle className="w-6 h-6" />
                     </div>
                     <h3 className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mb-2">Delete Scribble?</h3>
                     <p className="text-zinc-500 dark:text-zinc-400 text-sm mb-6">This action cannot be undone. Are you sure you want to permanently delete this?</p>
                     
                     <div className="flex gap-3 w-full">
                         <button 
                            onClick={() => setConfirmation({ show: false, id: null })}
                            className="flex-1 px-4 py-2 rounded-xl text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors text-sm font-medium"
                         >
                             Cancel
                         </button>
                         <button 
                            onClick={executeDelete}
                            className="flex-1 px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white transition-colors text-sm font-medium"
                         >
                             Delete
                         </button>
                     </div>
                 </motion.div>
             </div>
           )}
       </AnimatePresence>

      <div className="h-12 flex items-center justify-between mt-4">
        <div className="flex gap-6 text-[10px] uppercase tracking-[0.2em] font-bold text-zinc-500">
          <span>{textElements.length + shapeElements.length + strokes.length} Elements</span>
          <span>{activeTool === "hand" ? "PAN" : activeTool.toUpperCase()} Mode</span>
          <span>{Math.round(zoom * 100)}%</span>
        </div>
        <div className="text-[10px] font-bold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 opacity-50">
            Infinite Canvas Active
        </div>
      </div>
    </div>
  );
}
