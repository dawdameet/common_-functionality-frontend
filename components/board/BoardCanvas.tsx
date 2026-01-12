"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardType } from "./Card";
import { GitPullRequest, Sparkles, Plus, Layout, ArrowLeft, Type, StickyNote, Minus, Circle as CircleIcon, MousePointer2, Move, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

// --- Types ---

interface BaseItem {
  id: string;
  x: number;
  y: number;
}

interface NoteItem extends BaseItem {
  type: "note" | CardType;
  title: string;
  content: string;
  customColor?: string;
}

interface TextItem extends BaseItem {
  type: "text";
  content: string;
  color?: string;
}

interface ShapeItem extends BaseItem {
  type: "line" | "circle";
  endX: number;
  endY: number;
  color?: string;
}

type BoardItem = NoteItem | TextItem | ShapeItem;

const isNote = (item: BoardItem): item is NoteItem => 
  ["note", "idea", "decision", "constraint", "summary"].includes(item.type);
const isText = (item: BoardItem): item is TextItem => item.type === "text";
const isShape = (item: BoardItem): item is ShapeItem => ["line", "circle"].includes(item.type);

interface PersonalBoard {
  id: string;
  title: string;
  items: BoardItem[];
  createdAt: number;
}

type ViewMode = "shared" | "personal-list" | "personal-board";

const initialSharedItems: NoteItem[] = [
  {
    id: "1",
    type: "decision",
    title: "Privacy First",
    content: "Thinking is private by default. Reality is curated. Memory is permanent.",
    x: 100,
    y: 100,
  },
  {
    id: "2",
    type: "idea",
    title: "AI as Silent Operator",
    content: "AI never owns ideas or makes final decisions. It observes, summarizes, and connects.",
    x: 450,
    y: 150,
  },
  {
    id: "3",
    type: "constraint",
    title: "V1 Scope Lock",
    content: "No social feeds, no likes/upvotes, no external integrations beyond calendar.",
    x: 200,
    y: 400,
  },
];

// --- Main Component ---

export function BoardCanvas() {
  const [viewMode, setViewMode] = useState<ViewMode>("shared");
  const [personalBoards, setPersonalBoards] = useState<PersonalBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

  const createPersonalBoard = () => {
    const newBoard: PersonalBoard = {
      id: crypto.randomUUID(),
      title: `Personal Board ${personalBoards.length + 1}`,
      items: [],
      createdAt: Date.now(),
    };
    setPersonalBoards([newBoard, ...personalBoards]);
    setActiveBoardId(newBoard.id);
    setViewMode("personal-board");
  };

  const openBoard = (id: string) => {
    setActiveBoardId(id);
    setViewMode("personal-board");
  };

  const updateActiveBoard = (items: BoardItem[]) => {
    if (!activeBoardId) return;
    setPersonalBoards(boards => 
      boards.map(b => b.id === activeBoardId ? { ...b, items } : b)
    );
  };

  const activeBoard = personalBoards.find(b => b.id === activeBoardId);

  return (
    <div className="w-full h-full relative overflow-hidden bg-white dark:bg-zinc-950">
      {/* Navigation */}
      <div className="absolute top-4 left-4 md:left-auto md:right-4 z-50 flex gap-2">
        {viewMode === "shared" && (
          <>
            <button
              onClick={() => setViewMode("personal-list")}
              className="px-4 py-2 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-white/80 dark:hover:bg-zinc-800 transition-colors"
            >
              View My Boards
            </button>
            <button
              onClick={createPersonalBoard}
              className="px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg text-sm font-medium shadow-lg hover:scale-105 transition-transform flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Create Personal</span>
            </button>
          </>
        )}
        {(viewMode === "personal-list" || viewMode === "personal-board") && (
           <button
             onClick={() => setViewMode("shared")}
             className="px-4 py-2 bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 rounded-lg text-sm font-medium hover:bg-white/80 dark:hover:bg-zinc-800 transition-colors flex items-center gap-2"
           >
             <Layout className="w-4 h-4" />
             <span>General Board</span>
           </button>
        )}
      </div>

      {viewMode === "shared" && <SharedBoardView />}
      
      {viewMode === "personal-list" && (
        <PersonalBoardList 
          boards={personalBoards} 
          onOpen={openBoard} 
          onCreate={createPersonalBoard} 
        />
      )}
      
      {viewMode === "personal-board" && activeBoard && (
        <PersonalBoardView 
          board={activeBoard} 
          onUpdate={updateActiveBoard}
          onBack={() => setViewMode("personal-list")}
        />
      )}
    </div>
  );
}

// --- Infinite Canvas Component ---

interface InfiniteCanvasProps {
  children: React.ReactNode;
  onPanZoom?: (x: number, y: number, zoom: number) => void;
  className?: string;
}

function InfiniteCanvas({ children, className, onPanZoom }: InfiniteCanvasProps) {
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      const zoomSensitivity = 0.001;
      const newZoom = Math.min(Math.max(0.1, zoom - e.deltaY * zoomSensitivity), 5);
      setZoom(newZoom);
      onPanZoom?.(pan.x, pan.y, newZoom);
    } else {
      const newPan = { x: pan.x - e.deltaX, y: pan.y - e.deltaY };
      setPan(newPan);
      onPanZoom?.(newPan.x, newPan.y, zoom);
    }
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    };
    
    container.addEventListener('wheel', onWheel, { passive: false });
    return () => container.removeEventListener('wheel', onWheel);
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    // Use currentTarget for capture to ensure we capture the container
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    isDragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging.current) return;
    const deltaX = e.clientX - lastPos.current.x;
    const deltaY = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    
    setPan(prev => {
        const newPan = { x: prev.x + deltaX, y: prev.y + deltaY };
        return newPan;
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDragging.current = false;
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
  };

  useEffect(() => {
    onPanZoom?.(pan.x, pan.y, zoom);
  }, [pan, zoom, onPanZoom]);

  return (
    <div 
      ref={containerRef}
      className={cn("w-full h-full overflow-hidden cursor-grab active:cursor-grabbing touch-none bg-[radial-gradient(#e4e4e7_1px,transparent_1px)] dark:bg-[radial-gradient(#27272a_1px,transparent_1px)] [background-size:20px_20px]", className)}
      onWheel={handleWheel}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
          backgroundPosition: `${pan.x}px ${pan.y}px`,
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`
      }}
    >
      <div 
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
          width: "100%",
          height: "100%",
          position: "absolute",
          top: 0,
          left: 0,
        }}
      >
        {children}
      </div>
    </div>
  );
}

// --- Views ---

function PersonalBoardList({ boards, onOpen, onCreate }: { boards: PersonalBoard[], onOpen: (id: string) => void, onCreate: () => void }) {
  return (
    <div className="w-full h-full p-8 md:p-12 overflow-y-auto bg-white dark:bg-zinc-950">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 mb-8">My Boards</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button
            onClick={onCreate}
            className="h-48 rounded-2xl border-2 border-dashed border-zinc-200 dark:border-zinc-800 flex flex-col items-center justify-center gap-4 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 transition-colors"
          >
            <Plus className="w-8 h-8" />
            <span className="font-medium">Create New Board</span>
          </button>

          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => onOpen(board.id)}
              className="h-48 p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 flex flex-col items-start justify-between hover:shadow-lg transition-shadow text-left group"
            >
              <div>
                <h3 className="font-semibold text-lg text-zinc-900 dark:text-zinc-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {board.title}
                </h3>
                <p className="text-zinc-500 text-sm mt-2">
                  {board.items.length} items
                </p>
              </div>
              <div className="text-zinc-400 text-sm">
                {new Date(board.createdAt).toLocaleDateString()}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function SharedBoardView() {
  const [items] = useState<NoteItem[]>(initialSharedItems);
  const [isDrafting, setIsDrafting] = useState(false);
  const [submissionStatus, setSubmissionStatus] = useState<"idle" | "success">("idle");

  const handleSubmit = () => {
    setSubmissionStatus("success");
    setTimeout(() => {
      setIsDrafting(false);
      setSubmissionStatus("idle");
    }, 2000);
  };

  return (
    <div className="w-full h-full relative bg-white dark:bg-zinc-950">
       <InfiniteCanvas>
        {items.map((item) => (
          <div 
            key={item.id} 
            style={{ position: 'absolute', left: item.x, top: item.y, zIndex: 1 }}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <Card 
              id={item.id}
              type={item.type}
              title={item.title}
              content={item.content}
            />
          </div>
        ))}
       </InfiniteCanvas>

       <header className="absolute top-4 left-4 md:top-12 md:left-12 z-10 pointer-events-none">
        <h1 className="text-zinc-900 dark:text-zinc-100 text-2xl md:text-3xl font-light tracking-tight pointer-events-auto">Shared Board</h1>
        <p className="text-zinc-500 mt-1 md:mt-2 text-sm md:text-base pointer-events-auto">The canonical reality of your project.</p>
      </header>

      <div className="fixed md:absolute bottom-20 md:bottom-8 right-4 md:right-8 z-20">
        <button 
          onClick={() => setIsDrafting(true)}
          className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xl hover:scale-105 transition-transform font-medium text-sm md:text-base"
        >
          <GitPullRequest className="w-4 h-4" />
          <span>Draft Idea (PR)</span>
        </button>
      </div>
      
      <AnimatePresence>
        {isDrafting && (
           <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-12">
             <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-8 w-full max-w-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden min-h-[400px] flex flex-col justify-center"
            >
                <div className="flex flex-col h-full">
                    <h2 className="text-xl font-semibold mb-6">Mock Draft (Disabled in this view)</h2>
                    <button onClick={() => setIsDrafting(false)} className="mt-auto px-4 py-2 bg-zinc-200 dark:bg-zinc-800 rounded">Close</button>
                </div>
            </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function PersonalBoardView({ board, onUpdate, onBack }: { board: PersonalBoard, onUpdate: (items: BoardItem[]) => void, onBack: () => void }) {
  const [activeTool, setActiveTool] = useState<"cursor" | "note" | "text" | "line" | "circle">("cursor");
  const [canvasState, setCanvasState] = useState({ pan: { x: 0, y: 0 }, zoom: 1 });
  
  // Interaction States
  const [isDrawing, setIsDrawing] = useState(false);
  const [previewShape, setPreviewShape] = useState<ShapeItem | null>(null);
  const [draggingItem, setDraggingItem] = useState<{ id: string, startX: number, startY: number, itemStartX: number, itemStartY: number } | null>(null);

  // Helper to convert screen coords to world coords
  const toWorld = (screenX: number, screenY: number, rect: DOMRect) => {
    return {
      x: (screenX - rect.left - canvasState.pan.x) / canvasState.zoom,
      y: (screenY - rect.top - canvasState.pan.y) / canvasState.zoom
    };
  };

  const handlePanZoom = React.useCallback((x: number, y: number, zoom: number) => {
    setCanvasState(prev => {
      if (prev.pan.x === x && prev.pan.y === y && prev.zoom === zoom) return prev;
      return { pan: { x, y }, zoom };
    });
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest('button') || (e.target as Element).closest('input') || (e.target as Element).closest('textarea')) return;

    const container = e.currentTarget as HTMLDivElement;
    const rect = container.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const worldPos = toWorld(clientX, clientY, rect);

    if (activeTool === "cursor") {
       // Check for data-id on target or any of its ancestors
       const targetElement = (e.target as HTMLElement).closest('[data-id]') as HTMLElement;
       const targetId = targetElement?.dataset.id;
       
       if (targetId) {
           const item = board.items.find(i => i.id === targetId);
           if (item && !isNote(item)) { 
               setDraggingItem({
                   id: item.id,
                   startX: clientX,
                   startY: clientY,
                   itemStartX: item.x,
                   itemStartY: item.y
               });
               e.stopPropagation(); 
               return;
           }
       }
    }

    if (activeTool === "note") {
      const newItem: NoteItem = {
        id: crypto.randomUUID(),
        type: "note",
        title: "New Note",
        content: "Double click to edit...",
        x: worldPos.x - 100,
        y: worldPos.y - 50,
      };
      onUpdate([...board.items, newItem]);
      setActiveTool("cursor");
      e.stopPropagation();
    } else if (activeTool === "text") {
       const newItem: TextItem = {
        id: crypto.randomUUID(),
        type: "text",
        content: "Type here...",
        x: worldPos.x,
        y: worldPos.y - 12,
      };
      onUpdate([...board.items, newItem]);
      setActiveTool("cursor");
      e.stopPropagation();
    } else if (activeTool === "line" || activeTool === "circle") {
      setIsDrawing(true);
      setPreviewShape({
        id: "preview",
        type: activeTool,
        x: worldPos.x,
        y: worldPos.y,
        endX: worldPos.x,
        endY: worldPos.y,
        color: "#71717a"
      });
      e.stopPropagation(); 
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const container = e.currentTarget as HTMLDivElement;
    const rect = container.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const worldPos = toWorld(clientX, clientY, rect);

    if (draggingItem) {
        const deltaX = (clientX - draggingItem.startX) / canvasState.zoom;
        const deltaY = (clientY - draggingItem.startY) / canvasState.zoom;
        
        onUpdate(board.items.map(item => {
            if (item.id === draggingItem.id) {
                if (isShape(item)) {
                     const diffX = item.endX - item.x;
                     const diffY = item.endY - item.y;
                     const newX = draggingItem.itemStartX + deltaX;
                     const newY = draggingItem.itemStartY + deltaY;
                     return { ...item, x: newX, y: newY, endX: newX + diffX, endY: newY + diffY };
                }
                return { ...item, x: draggingItem.itemStartX + deltaX, y: draggingItem.itemStartY + deltaY };
            }
            return item;
        }));
        e.stopPropagation();
        return;
    }

    if (isDrawing && previewShape) {
      setPreviewShape({
        ...previewShape,
        endX: worldPos.x,
        endY: worldPos.y
      });
      e.stopPropagation();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingItem) {
        setDraggingItem(null);
    }
    if (isDrawing && previewShape) {
      const newItem: ShapeItem = {
        ...previewShape,
        id: crypto.randomUUID(),
      };
      onUpdate([...board.items, newItem]);
      setPreviewShape(null);
      setIsDrawing(false);
    }
  };

  const handleNoteUpdate = (id: string, updates: Partial<NoteItem>) => {
      onUpdate(board.items.map(item => {
        if (item.id === id && isNote(item)) {
          return { ...item, ...updates };
        }
        return item;
      }));
  };
  
  const handleNoteDelete = (id: string) => {
      onUpdate(board.items.filter(item => item.id !== id));
  };

  const handleTextUpdate = (id: string, newContent: string) => {
      onUpdate(board.items.map(item => {
        if (item.id === id && isText(item)) {
          return { ...item, content: newContent };
        }
        return item;
      }));
  };

  return (
    <div className="w-full h-full relative">
       <InfiniteCanvas 
         className={cn(activeTool !== "cursor" && "cursor-crosshair")}
         onPanZoom={handlePanZoom}
       >
         {/* Interaction Layer */}
         <div 
            className="absolute inset-0 w-full h-full z-10"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
         >
            {/* Shapes */}
            <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
                {board.items.filter(isShape).map(shape => (
                <g key={shape.id} className="pointer-events-auto cursor-move">
                    <g 
                        data-id={shape.id}
                        onMouseDown={(e) => {
                             // Bubble up to parent
                        }}
                    >
                         {shape.type === "line" && (
                            <line 
                                x1={shape.x} y1={shape.y} x2={shape.endX} y2={shape.endY} 
                                stroke={shape.color || "#71717a"} strokeWidth="3" strokeLinecap="round"
                                className="hover:stroke-blue-500 transition-colors"
                                data-id={shape.id}
                            />
                        )}
                        {shape.type === "circle" && (
                            <circle 
                                cx={shape.x + (shape.endX - shape.x)/2} 
                                cy={shape.y + (shape.endY - shape.y)/2} 
                                r={Math.sqrt(Math.pow(shape.endX - shape.x, 2) + Math.pow(shape.endY - shape.y, 2)) / 2} 
                                stroke={shape.color || "#71717a"} strokeWidth="3" fill="transparent"
                                className="hover:stroke-blue-500 transition-colors"
                                data-id={shape.id}
                            />
                        )}
                    </g>
                </g>
                ))}
                {previewShape && (
                   <g opacity="0.5">
                     {previewShape.type === "line" && (
                        <line 
                            x1={previewShape.x} y1={previewShape.y} x2={previewShape.endX} y2={previewShape.endY} 
                            stroke={previewShape.color} strokeWidth="3" strokeLinecap="round"
                        />
                    )}
                    {previewShape.type === "circle" && (
                        <circle 
                            cx={previewShape.x + (previewShape.endX - previewShape.x)/2} 
                            cy={previewShape.y + (previewShape.endY - previewShape.y)/2} 
                            r={Math.sqrt(Math.pow(previewShape.endX - previewShape.x, 2) + Math.pow(previewShape.endY - previewShape.y, 2)) / 2} 
                            stroke={previewShape.color} strokeWidth="3" fill="transparent"
                        />
                    )}
                   </g>
                )}
            </svg>

            {/* Text & Notes */}
            {board.items.map((item) => {
                if (isNote(item)) {
                return (
                    <div 
                        key={item.id} 
                        style={{ position: 'absolute', left: item.x, top: item.y, zIndex: 10 }}
                        onPointerDown={(e) => e.stopPropagation()} 
                    >
                    <Card 
                        id={item.id}
                        type={item.type}
                        title={item.title}
                        content={item.content}
                        customColor={item.customColor}
                        isEditable={true}
                        onUpdate={handleNoteUpdate}
                        onDelete={handleNoteDelete}
                    />
                    </div>
                );
                }
                if (isText(item)) {
                return (
                    <div 
                        key={item.id}
                        className="absolute z-20 cursor-move"
                        style={{ left: item.x, top: item.y }}
                        data-id={item.id}
                    >
                        <div className="group relative">
                             <input 
                                className="bg-transparent border-none outline-none text-zinc-900 dark:text-zinc-100 font-medium text-lg min-w-[200px]"
                                value={item.content}
                                onChange={(e) => handleTextUpdate(item.id, e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Escape") {
                                      (e.target as HTMLInputElement).blur();
                                    }
                                  }}
                                onPointerDown={(e) => {
                                    // Allow text selection if not dragging handle
                                    e.stopPropagation();
                                }}
                                placeholder="Type here..."
                            />
                            {/* Drag Handle for Text */}
                            <div 
                                className="absolute -left-4 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 cursor-grab text-zinc-400"
                                onPointerDown={(e) => {
                                    // This event bubbles to parent with data-id
                                    // Wait, if we stop propagation here, the parent won't see it?
                                    // The parent PersonalBoardView handles dragging via draggingItem state.
                                    // The PARENT is listening on the Interaction Layer.
                                    // So for Text, we DO want it to bubble to handlePointerDown!
                                    // But we DON'T want it to bubble to InfiniteCanvas.
                                    // The InfiniteCanvas is the grandparent.
                                    // PersonalBoardView.handlePointerDown is attached to the "Interaction Layer" div.
                                    // Note wrapper is INSIDE Interaction Layer.
                                    // InfiniteCanvas WRAPS Interaction Layer.
                                }}
                                data-id={item.id}
                            >
                                <Move className="w-3 h-3" />
                            </div>
                        </div>
                    </div>
                );
                }
                return null;
            })}
         </div>
       </InfiniteCanvas>

      <div className="absolute top-4 left-4 md:top-12 md:left-12 z-30 flex items-center gap-4 pointer-events-none">
        <button onClick={onBack} className="pointer-events-auto p-2 rounded-full bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl md:text-2xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 pointer-events-auto">{board.title}</h2>
      </div>

      <div className="absolute bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-30 flex items-center gap-2 p-2 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl pointer-events-auto">
        <button
          onClick={() => setActiveTool("cursor")}
          className={cn(
            "p-3 rounded-xl transition-colors",
            activeTool === "cursor" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          )}
          title="Select / Move"
        >
          <MousePointer2 className="w-5 h-5" />
        </button>
        <div className="w-px h-8 bg-zinc-200 dark:bg-zinc-800 mx-1" />
        <button
          onClick={() => setActiveTool("note")}
          className={cn(
            "p-3 rounded-xl transition-colors",
            activeTool === "note" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          )}
          title="Sticky Note"
        >
          <StickyNote className="w-5 h-5" />
        </button>
        <button
          onClick={() => setActiveTool("text")}
          className={cn(
            "p-3 rounded-xl transition-colors",
            activeTool === "text" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          )}
          title="Text"
        >
          <Type className="w-5 h-5" />
        </button>
         <button
          onClick={() => setActiveTool("line")}
          className={cn(
            "p-3 rounded-xl transition-colors",
            activeTool === "line" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          )}
          title="Line"
        >
          <Minus className="w-5 h-5 -rotate-45" />
        </button>
         <button
          onClick={() => setActiveTool("circle")}
          className={cn(
            "p-3 rounded-xl transition-colors",
            activeTool === "circle" ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100" : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
          )}
          title="Circle"
        >
          <CircleIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}