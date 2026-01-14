"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Pen, Type, Circle, Eraser, MousePointer, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Tool = "select" | "pen" | "text" | "circle" | "eraser";

type BoardObject = {
  id: string;
  type: "path" | "text" | "circle" | "image";
  x: number;
  y: number;
  data: any; // Path points, text content, circle radius, or image URL
  color: string;
  width?: number; // For image width
  height?: number; // For image height
};

interface TransientBoardProps {
  roomId: string;
  onUpdate?: (objects: BoardObject[]) => void;
}

export function TransientBoard({ roomId, onUpdate }: TransientBoardProps) {
  const [objects, setObjects] = useState<BoardObject[]>([]);
  const [currentTool, setCurrentTool] = useState<Tool>("pen");
  const [color, setColor] = useState("#ffffff");
  const [activeObj, setActiveObj] = useState<BoardObject | null>(null); // For drawing/typing
  
  const svgRef = useRef<SVGSVGElement>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  const [textEditing, setTextEditing] = useState<{ id: string, x: number, y: number, text: string } | null>(null);
  const [dragOffset, setDragOffset] = useState<{ x: number, y: number } | null>(null);

  // Drag and Drop Handler
  const handleDragOver = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const files = Array.from(e.dataTransfer.files);
      const imageFiles = files.filter(f => f.type.startsWith('image/'));
      
      if (imageFiles.length > 0) {
          const file = imageFiles[0];
          const reader = new FileReader();
          reader.onload = (event) => {
              const url = event.target?.result as string;
              if (url) {
                  const { x, y } = getCoords(e as unknown as React.PointerEvent); // Cast simplistic
                  const newObj: BoardObject = {
                      id: crypto.randomUUID(),
                      type: 'image',
                      x: x - 100, // Center approx
                      y: y - 100,
                      data: url,
                      color: 'transparent',
                      width: 200,
                      height: 200
                  };
                  setObjects(prev => [...prev, newObj]);
                  broadcast("obj-add", newObj);
              }
          };
          reader.readAsDataURL(file);
      }
  };

  // Sync Logic
  useEffect(() => {
    const channel = supabase.channel(`meet-board:${roomId}`, {
      config: { broadcast: { self: false } },
    });

    channel
      .on("broadcast", { event: "obj-add" }, ({ payload }) => {
        setObjects((prev) => [...prev, payload]);
      })
      .on("broadcast", { event: "obj-update" }, ({ payload }) => {
        setObjects((prev) => prev.map(o => o.id === payload.id ? payload : o));
      })
      .on("broadcast", { event: "obj-delete" }, ({ payload }) => {
        setObjects((prev) => prev.filter(o => o.id !== payload.id));
      })
      .subscribe();

    channelRef.current = channel;
    return () => { channel.unsubscribe(); };
  }, [roomId]);

  useEffect(() => { onUpdate?.(objects); }, [objects, onUpdate]);

  // Actions
  const broadcast = (event: string, payload: any) => {
    channelRef.current?.send({ type: "broadcast", event, payload });
  };

  const getCoords = (e: React.PointerEvent) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    // If text editing, commit it first
    if (textEditing) {
        commitText();
        return;
    }

    const { x, y } = getCoords(e);
    const id = crypto.randomUUID();

    if (currentTool === "select") {
        // Hit detection is handled by onClick on elements, 
        // but if we click empty space, deselect.
        // We'll let bubble-up handle deselect if no object stopped propagation.
        setActiveObj(null);
    } else if (currentTool === "pen") {
        e.currentTarget.setPointerCapture(e.pointerId);
        const newObj: BoardObject = {
            id, type: "path", x: 0, y: 0, color, data: [[x, y]]
        };
        setActiveObj(newObj);
        setObjects(prev => [...prev, newObj]);
        broadcast("obj-add", newObj);
    } else if (currentTool === "circle") {
        e.currentTarget.setPointerCapture(e.pointerId);
        const newObj: BoardObject = {
            id, type: "circle", x, y, color, data: { r: 0 }
        };
        setActiveObj(newObj);
        setObjects(prev => [...prev, newObj]);
        broadcast("obj-add", newObj);
    } else if (currentTool === "text") {
        // Start text editing mode
        setTextEditing({ id, x, y, text: "" });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const { x, y } = getCoords(e);

    if (currentTool === "select" && activeObj && dragOffset) {
        // Dragging
        const newX = x - dragOffset.x;
        const newY = y - dragOffset.y;
        const updated = { ...activeObj, x: newX, y: newY };
        
        // If it's a path, we must shift all points relative to new position? 
        // Or better, just group transform. 
        // For simplicity in V1, let's treat Path x,y as 0,0 usually, but if we move it, we update its transform or points.
        // Let's actually shift points for paths, or update x/y and use translation.
        // EASIEST: Update x/y and use `transform="translate(x,y)"` in render.
        // But for Path, `activeObj` has data points. 
        // Let's just update `x` and `y` property of BoardObject and use that for transform.
        
        setActiveObj(updated);
        setObjects(prev => prev.map(o => o.id === activeObj.id ? updated : o));
        broadcast("obj-update", updated); // Throttle in prod
        return;
    }

    if (!activeObj) return;

    // Drawing Logic
    if (activeObj.type === "path") {
        const newData = [...activeObj.data, [x, y]];
        const updated = { ...activeObj, data: newData };
        setActiveObj(updated);
        setObjects(prev => prev.map(o => o.id === activeObj.id ? updated : o));
    } else if (activeObj.type === "circle") {
        const dx = x - activeObj.x;
        const dy = y - activeObj.y;
        const r = Math.sqrt(dx*dx + dy*dy);
        const updated = { ...activeObj, data: { r } };
        setActiveObj(updated);
        setObjects(prev => prev.map(o => o.id === activeObj.id ? updated : o));
    }
  };

  const handlePointerUp = () => {
    // If drawing, finish
    if (currentTool !== "select") {
        if (activeObj) {
            broadcast("obj-update", activeObj); // Final update
        }
        setActiveObj(null);
    }
    // If selecting/dragging, drop
    setDragOffset(null);
  };

  const handleObjectDown = (e: React.PointerEvent, obj: BoardObject) => {
      e.stopPropagation();
      if (currentTool === "select") {
          setActiveObj(obj);
          const { x, y } = getCoords(e);
          setDragOffset({ x: x - obj.x, y: y - obj.y });
      } else if (currentTool === "eraser") {
          deleteObject(obj.id);
      }
  };

  const deleteObject = (id: string) => {
      setObjects(prev => prev.filter(o => o.id !== id));
      broadcast("obj-delete", { id });
      setActiveObj(null);
  };

  const commitText = () => {
      if (!textEditing || !textEditing.text.trim()) {
          setTextEditing(null);
          return;
      }
      const newObj: BoardObject = {
          id: textEditing.id,
          type: "text",
          x: textEditing.x,
          y: textEditing.y,
          color,
          data: textEditing.text
      };
      setObjects(prev => [...prev, newObj]);
      broadcast("obj-add", newObj);
      setTextEditing(null);
      setCurrentTool("select");
  };

  // Keyboard Delete
  useEffect(() => {
      const handleKey = (e: KeyboardEvent) => {
          if ((e.key === "Delete" || e.key === "Backspace") && activeObj && currentTool === "select" && !textEditing) {
              deleteObject(activeObj.id);
          }
      };
      window.addEventListener("keydown", handleKey);
      return () => window.removeEventListener("keydown", handleKey);
  }, [activeObj, currentTool, textEditing]);

  return (
    <div 
        className="w-full h-full relative group"
        onDragOver={handleDragOver}
        onDrop={handleDrop}
    >
      {/* Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-zinc-800 rounded-full p-2 flex gap-2 shadow-xl border border-zinc-700 z-10">
        <ToolBtn active={currentTool === "select"} onClick={() => setCurrentTool("select")} icon={<MousePointer size={16} />} />
        <ToolBtn active={currentTool === "pen"} onClick={() => setCurrentTool("pen")} icon={<Pen size={16} />} />
        <ToolBtn active={currentTool === "text"} onClick={() => setCurrentTool("text")} icon={<Type size={16} />} />
        <ToolBtn active={currentTool === "circle"} onClick={() => setCurrentTool("circle")} icon={<Circle size={16} />} />
        <ToolBtn active={currentTool === "eraser"} onClick={() => setCurrentTool("eraser")} icon={<Eraser size={16} />} />
        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded-full border-0 p-0 bg-transparent cursor-pointer" />
      </div>

      <div className="absolute top-4 left-4 text-xs text-zinc-500 pointer-events-none select-none">
        Shared Board • {currentTool.toUpperCase()} Mode
      </div>

      <svg
        ref={svgRef}
        className={cn("w-full h-full touch-none", currentTool === "select" ? "cursor-default" : "cursor-crosshair")}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {objects.map((obj) => (
          <g 
            key={obj.id} 
            transform={`translate(${obj.x}, ${obj.y})`}
            onPointerDown={(e) => handleObjectDown(e, obj)}
            className={cn(
                currentTool === "select" || currentTool === "eraser" ? "cursor-pointer" : "",
                activeObj?.id === obj.id && currentTool === "select" ? "opacity-80" : ""
            )}
            style={{ pointerEvents: "all" }} // Ensure G captures events
          >
            {obj.type === "path" && (
              <path
                d={`M ${obj.data.map((p: any) => `${p[0] - obj.x} ${p[1] - obj.y}`).join(" L ")}`} // Adjust points relative to Group transform
                stroke={obj.color}
                strokeWidth={3}
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
            {obj.type === "circle" && (
                <circle cx={0} cy={0} r={obj.data.r} stroke={obj.color} strokeWidth={2} fill="transparent" />
            )}
            {obj.type === "text" && (
                <text x={0} y={0} fill={obj.color} fontSize="20" fontFamily="sans-serif" dy="0.35em">{obj.data}</text>
            )}
            {obj.type === "image" && (
                <image 
                    href={obj.data} 
                    x={0} y={0} 
                    width={obj.width || 200} 
                    height={obj.height || 200} 
                    preserveAspectRatio="xMidYMid slice"
                />
            )}
            
            {/* Selection Box */}
            {activeObj?.id === obj.id && currentTool === "select" && (
                 <rect 
                    x={obj.type === 'image' ? -5 : -10} 
                    y={obj.type === 'image' ? -5 : -10}
                    width={obj.type === 'circle' ? obj.data.r * 2 + 20 : obj.type === 'image' ? (obj.width || 200) + 10 : 20} 
                    height={obj.type === 'image' ? (obj.height || 200) + 10 : 20} 
                    stroke="cyan" strokeDasharray="4" fill="none" 
                    className="pointer-events-none"
                 />
                 // Note: Accurate bounding box requires refs or calculations. 
                 // For V1 simple visual feedback: we just highlight opacity or show a simple marker.
            )}
          </g>
        ))}
      </svg>

      {/* Text Editing Overlay */}
      {textEditing && (
          <textarea
            autoFocus
            value={textEditing.text}
            onChange={(e) => setTextEditing(prev => prev ? ({ ...prev, text: e.target.value }) : null)}
            onBlur={commitText}
            onKeyDown={(e) => { if(e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitText(); } }}
            style={{
                position: 'absolute',
                left: textEditing.x,
                top: textEditing.y,
                color: color,
                fontSize: '20px',
                fontFamily: 'sans-serif',
                background: 'transparent',
                border: '1px dashed cyan',
                outline: 'none',
                minWidth: '100px',
                minHeight: '1.2em',
                resize: 'none',
                zIndex: 100
            }}
            placeholder="Type here..."
          />
      )}
    </div>
  );
}

function ToolBtn({ active, onClick, icon }: any) {
    return (
        <button 
            onClick={onClick}
            className={cn("p-2 rounded-full transition-colors", active ? "bg-indigo-600 text-white" : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700")}
        >
            {icon}
        </button>
    )
}