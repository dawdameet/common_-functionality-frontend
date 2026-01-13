"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardType } from "./Card";
import { GitPullRequest, Sparkles, Plus, Layout, ArrowLeft, Type, StickyNote, Minus, Circle as CircleIcon, MousePointer2, Move, Trash2, Pencil, ArrowRight, Eraser } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUser } from "../auth/UserContext";
import { COLOR_THEMES, ColorTheme } from "./Card";
import { createClient } from "@/utils/supabase/client";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

// --- Types ---

interface BaseItem {
  id: string;
  x: number;
  y: number;
  status?: 'pending' | 'approved';
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
  type: "line" | "circle" | "arrow";
  endX: number;
  endY: number;
  color?: string;
}

interface PencilItem extends BaseItem {
  type: "pencil";
  points: { x: number, y: number }[];
  color?: string;
}

type BoardItem = NoteItem | TextItem | ShapeItem | PencilItem;

const isNote = (item: BoardItem): item is NoteItem =>
  ["note", "idea", "decision", "constraint", "summary"].includes(item.type);
const isText = (item: BoardItem): item is TextItem => item.type === "text";
const isShape = (item: BoardItem): item is ShapeItem => ["line", "circle", "arrow"].includes(item.type);
const isPencil = (item: BoardItem): item is PencilItem => item.type === "pencil";

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

// ... existing code ...

export function BoardCanvas() {
  const [viewMode, setViewMode] = useState<ViewMode>("shared");
  const [personalBoards, setPersonalBoards] = useState<PersonalBoard[]>([]);
  const [activeBoardId, setActiveBoardId] = useState<string | null>(null);

  const createPersonalBoard = (initialTitle?: string, initialItems?: BoardItem[]) => {
    const newBoard: PersonalBoard = {
      id: crypto.randomUUID(),
      title: initialTitle || `Personal Board ${personalBoards.length + 1}`,
      items: initialItems || [],
      createdAt: Date.now(),
    };
    setPersonalBoards([newBoard, ...personalBoards]);
    setActiveBoardId(newBoard.id);
    // Don't switch view mode automatically if it's an auto-creation from draft (unless desired? User said "auto create", didn't say "switch to").
    // Let's assume we WANT to switch to it to show the user "Here is your workspace" or maybe stay on Shared so they can see "Pending".
    // User context: "auto create a new personla board...". Usually implies "saving a copy for myself".
    // I will NOT switch view mode instantly if it disrupts the drafting flow, but maybe a toast?
    // Actually, simply creating it is enough. Let's NOT switch view mode to avoid jarring context switch.
    // Wait, the user might want to work on it.
    // Let's only switch if no args provided (default button).
    if (!initialTitle) {
      setViewMode("personal-board");
    }
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
              onClick={() => createPersonalBoard()}
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

      {viewMode === "shared" && <SharedBoardView onCreatePersonalBoard={createPersonalBoard} />}

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

function NotificationModal({ message, onClose, type = 'success' }: { message: string, onClose: () => void, type?: 'success' | 'error' }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white dark:bg-zinc-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col items-center text-center"
      >
        <div className={cn(
          "w-12 h-12 rounded-full flex items-center justify-center mb-4",
          type === 'success' ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" : "bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400"
        )}>
          {type === 'success' ? <Sparkles className="w-6 h-6" /> : <Trash2 className="w-6 h-6" />}
        </div>

        <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-2">
          {type === 'success' ? 'Success' : 'Error'}
        </h3>
        <p className="text-sm text-zinc-500 mb-6">
          {message}
        </p>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-medium hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          Got it
        </button>
      </motion.div>
    </div>
  );
}


function BoardTextInput({ item, readOnly, onUpdate, getThemeHex }: {
  item: TextItem, readOnly?: boolean, onUpdate?: (id: string, val: string) => void, getThemeHex: (key?: string) => string
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [localValue, setLocalValue] = useState(item.content);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  // Sync local value with prop when NOT focused (external updates)
  useEffect(() => {
    if (!isFocused) {
      setLocalValue(item.content);
    }
  }, [item.content, isFocused]);

  // Auto-resize
  useEffect(() => {
    if (textAreaRef.current) {
      textAreaRef.current.style.height = "auto";
      textAreaRef.current.style.height = textAreaRef.current.scrollHeight + "px";
      // Basic width expansion
      textAreaRef.current.style.width = "auto";
      textAreaRef.current.style.width = Math.max(200, textAreaRef.current.scrollWidth) + "px";
    }
  }, [localValue]);


  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setLocalValue(val);
    onUpdate?.(item.id, val);
  };

  return (
    <div
      className={cn("absolute z-20", !readOnly && "cursor-move")}
      style={{ left: item.x, top: item.y }}
      data-id={item.id}
    >
      <div className="group relative">
        <textarea
          ref={textAreaRef}
          className="bg-transparent border-none outline-none font-medium text-lg overflow-hidden resize-none"
          style={{ color: getThemeHex(item.color) }}
          value={localValue}
          readOnly={readOnly}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          rows={1}
          onKeyDown={(e) => {
            if (e.key === "Escape") {
              (e.target as HTMLTextAreaElement).blur();
            }
          }}
          onPointerDown={(e) => {
            e.stopPropagation();
          }}
        />
        {!readOnly && (
          <div
            className="absolute -left-4 top-1/2 -translate-y-1/2 p-1 opacity-0 group-hover:opacity-100 cursor-grab text-zinc-400"
            data-id={item.id}
          >
            <Move className="w-3 h-3" />
          </div>
        )}
      </div>
    </div>
  );
}

function ApprovalQueue({ items, onApprove, onReject }: {
  items: BoardItem[],
  onApprove: (id: string, x?: number, y?: number) => void,
  onReject: (id: string) => void
}) {
  return (
    <div className="absolute top-20 right-4 z-40 flex flex-col gap-2 max-h-[calc(100vh-160px)] overflow-y-auto pr-2 custom-scrollbar">
      <h3 className="text-xs font-bold uppercase text-zinc-400 tracking-wider mb-2">Pending Proposals</h3>
      <div className="flex flex-col gap-3">
        {items.map(item => (
          <div key={item.id} className="w-80 p-4 bg-white dark:bg-zinc-900 rounded-xl border border-dashed border-amber-300 dark:border-amber-700/50 shadow-lg relative group">
            <div className="flex justify-between items-start mb-2">
              <span className="text-[10px] font-mono text-zinc-400 uppercase border border-zinc-200 dark:border-zinc-800 px-1.5 py-0.5 rounded">
                {isNote(item) ? item.type : "item"}
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => onReject(item.id)}
                  className="p-1 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 rounded transition-colors"
                  title="Reject"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onApprove(item.id, Math.random() * 400 + 100, Math.random() * 300 + 100)}
                  className="p-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 text-emerald-500 rounded transition-colors"
                  title="Approve"
                >
                  <Sparkles className="w-4 h-4" />
                </button>
              </div>
            </div>

            {(isNote(item) || isText(item)) && (
              <>
                <h4 className="font-semibold text-sm text-zinc-900 dark:text-zinc-100 mb-1 line-clamp-1">{(item as any).title || "Untitled"}</h4>
                <p className="text-xs text-zinc-500 line-clamp-3 leading-relaxed">
                  {(item as any).content || "No content"}
                </p>
              </>
            )}
            {!isNote(item) && !isText(item) && (
              <div className="flex items-center justify-center py-4 text-zinc-400 text-xs">
                <Layout className="w-6 h-6 mb-2 opacity-50" />
                <span className="block">Drawing / Shape</span>
              </div>
            )}
          </div>
        ))}
      </div>
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

// --- Shared Board (Supabase) ---

function SharedBoardView({ onCreatePersonalBoard }: { onCreatePersonalBoard: (title: string, items: BoardItem[]) => void }) {
  const { currentUser } = useUser();
  const [items, setItems] = useState<BoardItem[]>([]);
  const [isDrafting, setIsDrafting] = useState(false);
  const [notification, setNotification] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const supabase = createClient();
  const isModerator = currentUser.role === "moderator";

  // Fetch & Realtime
  useEffect(() => {
    // Initial Fetch
    const fetchItems = async () => {
      const { data } = await supabase.from('board_items').select('*').neq('status', 'archived');
      if (data) {
        const parsedItems: BoardItem[] = data.map(row => ({
          id: row.id,
          type: row.type as any, // Cast, we ensured types match
          title: row.title,
          content: row.content,
          x: row.position.x,
          y: row.position.y,
          status: row.status,
          ...row.meta // Spread color, endX, endY, points
        }));
        setItems(parsedItems);
      }
    };
    fetchItems();

    // Realtime Subscription
    const channel = supabase.channel('board_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'board_items' }, (payload: RealtimePostgresChangesPayload<any>) => {
        if (payload.eventType === 'INSERT') {
          const row = payload.new;
          const newItem: BoardItem = {
            id: row.id,
            type: row.type as any,
            title: row.title,
            content: row.content,
            x: row.position.x,
            y: row.position.y,
            status: row.status,
            ...row.meta
          };
          setItems(prev => [...prev.filter(i => i.id !== newItem.id), newItem]);
        } else if (payload.eventType === 'UPDATE') {
          const row = payload.new;
          const updatedItem: BoardItem = {
            id: row.id,
            type: row.type as any,
            title: row.title,
            content: row.content,
            x: row.position.x,
            y: row.position.y,
            status: row.status,
            ...row.meta
          };
          setItems(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
        } else if (payload.eventType === 'DELETE') {
          setItems(prev => prev.filter(i => i.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // CRUD Handlers
  const handleCreate = async (item: BoardItem) => {
    // Prepare payload
    const { id, type, title, content, x, y, ...meta } = item as any;
    const payload = {
      id, // Use client-generated ID for optimistic consistency? Or let DB gen?
      // Optimistic ID is fine if UUID.
      title: title || '',
      content: content || '',
      type,
      author_id: currentUser.id,
      status: 'approved', // Mods auto-approve
      position: { x, y },
      meta: meta // color, endX, endY, points
    };

    // Optimistic Update
    setItems(prev => [...prev, item]);

    await supabase.from('board_items').insert(payload);
  };

  const handleUpdate = async (item: BoardItem) => {
    // Optimistic
    setItems(prev => prev.map(i => i.id === item.id ? item : i));

    const { id, type, title, content, x, y, ...meta } = item as any;
    await supabase.from('board_items').update({
      title, content, position: { x, y }, meta
    }).eq('id', id);
  };

  const handleDelete = async (id: string) => {
    // Optimistic
    setItems(prev => prev.filter(i => i.id !== id));
    await supabase.from('board_items').delete().eq('id', id);
  };

  const handleApprove = async (id: string, x: number = 200, y: number = 200) => {
    // Move to board (approve)
    // Set position to where-ever, or maybe create a stack. Logic:
    // Moderator approves -> it becomes "approved" and visible on board.
    // Ideally we place it somewhere visible. Let's use 200,200 for now or random near center.
    // Updating status to 'approved'.

    const item = items.find(i => i.id === id);
    if (!item) return;

    const updatedItem = { ...item, status: 'approved' as const, x, y };

    setItems(prev => prev.map(i => i.id === id ? updatedItem : i));

    await supabase.from('board_items').update({
      status: 'approved',
      position: { x, y }
    }).eq('id', id);
  };

  const handleReject = async (id: string) => {
    handleDelete(id);
  };

  const handleEmptyBoard = async () => {
    if (confirm("Are you sure you want to EMPTY the ENTIRE shared board? This cannot be undone.")) {
      // 1. Clear local
      setItems([]);
      // 2. Clear DB (except archived?) or just nuke all.
      // User said "EMPTY BOARD". 
      await supabase.from('board_items').delete().neq('status', 'archived');
    }
  };

  // Filter items
  // Active: approved items OR (if moderator, items I made that are on board? No, canvas shows only approved)
  // Let's decide: Canvas shows "Approved" items. 
  // "Pending" items are in the queue.
  const activeItems = items.filter(i => i.status === 'approved');
  const pendingItems = items.filter(i => i.status === 'pending');

  return (
    <div className="w-full h-full relative bg-white dark:bg-zinc-950">
      <CanvasBoard
        items={activeItems}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        readOnly={!isModerator}
        title="Shared Board"
      />

      <header className="absolute top-4 left-4 md:top-12 md:left-12 z-10 pointer-events-none">
        <h1 className="text-zinc-900 dark:text-zinc-100 text-2xl md:text-3xl font-light tracking-tight pointer-events-auto">Shared Board</h1>
        <p className="text-zinc-500 mt-1 md:mt-2 text-sm md:text-base pointer-events-auto">The canonical reality of your project.</p>
      </header>

      {/* Draft PR Button - Hidden for now or keep as "Draft Idea" for transparency? 
           Let's keep it but maybe restricted? Or let General users draft, but only Mod sees?
           For V1 scope, let's keep it simple.
       */}
      {!isModerator && (
        <div className="fixed md:absolute bottom-20 md:bottom-8 right-4 md:right-8 z-20">
          <button
            onClick={() => setIsDrafting(true)}
            className="flex items-center gap-2 px-4 py-2 md:px-6 md:py-3 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 shadow-xl hover:scale-105 transition-transform font-medium text-sm md:text-base animate-in fade-in slide-in-from-bottom-4"
          >
            <GitPullRequest className="w-4 h-4" />
            <span>Draft Idea (PR)</span>
          </button>
        </div>
      )}

      {isModerator && (
        <div className="absolute top-4 right-4 z-20">
          <button
            onClick={handleEmptyBoard}
            className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg border border-red-500/20 transition-colors text-sm font-medium"
          >
            <Trash2 className="w-4 h-4" />
            <span>Empty Board</span>
          </button>
        </div>
      )}

      {isModerator && pendingItems.length > 0 && (
        <ApprovalQueue
          items={pendingItems}
          onApprove={handleApprove}
          onReject={handleReject}
        />
      )}

      <AnimatePresence>
        {isDrafting && (
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-12">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-zinc-900 rounded-2xl p-8 w-full max-w-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 relative overflow-hidden flex flex-col"
            >
              <DraftProposalForm
                onClose={() => setIsDrafting(false)}
                onSubmit={async (data) => {
                  const { error } = await supabase.from('board_items').insert({
                    title: data.title,
                    content: data.content,
                    type: data.type,
                    author_id: currentUser.id,
                    status: 'pending',
                    position: { x: 0, y: 0 } // Default position, Mods will move it
                  });
                  if (!error) {
                    setIsDrafting(false);

                    // Auto-create Personal Board Copy
                    const personalCopyItem: NoteItem = {
                      id: crypto.randomUUID(),
                      type: data.type === "idea" ? "idea" : "note",
                      title: data.title,
                      content: data.content,
                      x: 100, y: 100,
                      status: 'approved'
                    };
                    onCreatePersonalBoard(data.title, [personalCopyItem]);
                    setNotification({
                      message: "Draft submitted! A personal board copy has been created for you.",
                      type: 'success'
                    });

                  } else {
                    setNotification({
                      message: "Failed to submit: " + error.message,
                      type: 'error'
                    });
                  }
                }}
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {notification && (
          <NotificationModal
            message={notification.message}
            type={notification.type}
            onClose={() => setNotification(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}


function DraftProposalForm({ onClose, onSubmit }: { onClose: () => void, onSubmit: (data: any) => void }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [type, setType] = useState<"idea" | "decision" | "constraint">("idea");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    await onSubmit({ title, content, type });
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col h-full gap-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">Draft Proposal</h2>
        <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
          <Trash2 className="w-5 h-5 rotate-45" />
        </button>
      </div>

      <p className="text-sm text-zinc-500 mb-4">
        Propose an Item. It will appear as 'Pending' until a Moderator approves it.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Type</label>
          <div className="flex gap-2">
            {(["idea", "decision", "constraint"] as const).map(t => (
              <button
                key={t}
                type="button"
                onClick={() => setType(t)}
                className={cn(
                  "px-3 py-1.5 rounded-lg border text-sm capitalize transition-colors",
                  type === t
                    ? "bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-zinc-900 dark:border-zinc-100"
                    : "border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800"
                )}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Title</label>
          <input
            required
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 ring-zinc-500/20"
            placeholder="Short title"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-500 mb-1">Content</label>
          <textarea
            required
            value={content}
            onChange={e => setContent(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700 outline-none focus:ring-2 ring-zinc-500/20 min-h-[100px] resize-none"
            placeholder="Describe your idea..."
          />
        </div>
      </div>

      <div className="mt-auto flex justify-end gap-2 pt-4">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-medium bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {isSubmitting ? "Submitting..." : "Submit Proposal"}
        </button>
      </div>
    </form>
  );
}

function PersonalBoardView({ board, onUpdate, onBack }: { board: PersonalBoard, onUpdate: (items: BoardItem[]) => void, onBack: () => void }) {
  // Adapter for new callbacks
  const handleCreate = (item: BoardItem) => onUpdate([...board.items, item]);
  const handleUpdate = (item: BoardItem) => onUpdate(board.items.map(i => i.id === item.id ? item : i));
  const handleDelete = (id: string) => onUpdate(board.items.filter(i => i.id !== id));

  return (
    <div className="w-full h-full relative">
      <CanvasBoard
        items={board.items}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        readOnly={false}
        title={board.title}
      />

      <div className="absolute top-4 left-4 md:top-12 md:left-12 z-30 flex items-center gap-4 pointer-events-none">
        <button onClick={onBack} className="pointer-events-auto p-2 rounded-full bg-white/50 dark:bg-zinc-800/50 backdrop-blur-md border border-zinc-200 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-700 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h2 className="text-xl md:text-2xl font-light tracking-tight text-zinc-900 dark:text-zinc-100 pointer-events-auto">{board.title}</h2>
      </div>
    </div>
  );
}

// --- CanvasBoard: Reusable Interactive Board ---

interface CanvasBoardProps {
  items: BoardItem[];
  onCreate: (item: BoardItem) => void;
  onUpdate: (item: BoardItem) => void;
  onDelete: (id: string) => void;
  readOnly?: boolean;
  title?: string;
}

function CanvasBoard({ items, onCreate, onUpdate, onDelete, readOnly }: CanvasBoardProps) {
  const [activeTool, setActiveTool] = useState<"cursor" | "note" | "text" | "line" | "circle" | "pencil" | "arrow" | "eraser">("cursor");
  const [selectedColor, setSelectedColor] = useState<ColorTheme>("zinc");
  const [canvasState, setCanvasState] = useState({ pan: { x: 0, y: 0 }, zoom: 1 });

  // Interaction States
  const [isDrawing, setIsDrawing] = useState(false);
  const [previewShape, setPreviewShape] = useState<ShapeItem | null>(null);
  const [previewPencil, setPreviewPencil] = useState<PencilItem | null>(null);

  // Temp item state for smooth dragging without constant parent updates
  const [dragState, setDragState] = useState<{ id: string, startX: number, startY: number, initialItem: BoardItem } | null>(null);
  const [tempItem, setTempItem] = useState<BoardItem | null>(null);

  // Helper for getting hex from theme key
  const getThemeHex = (themeKey?: string) => {
    if (!themeKey) return "#71717a";
    return (COLOR_THEMES as any)[themeKey]?.preview || themeKey;
  };

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
    if (readOnly) return; // No interaction in read-only mode

    const container = e.currentTarget as HTMLDivElement;
    const rect = container.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const worldPos = toWorld(clientX, clientY, rect);

    // Check for data-id on target or any of its ancestors
    const targetElement = (e.target as HTMLElement).closest('[data-id]') as HTMLElement;
    const targetId = targetElement?.dataset.id;

    // Eraser Logic
    if (activeTool === "eraser" && targetId) {
      onDelete(targetId);
      e.stopPropagation();
      return;
    }

    if (activeTool === "cursor") {
      if (targetId) {
        const item = items.find(i => i.id === targetId);
        if (item && !isNote(item)) { // Notes are handled by their own Card component
          setDragState({
            id: item.id,
            startX: clientX,
            startY: clientY,
            initialItem: item
          });
          setTempItem(item);
          e.stopPropagation();
          return;
        }
      }
    }

    // Tool Logic
    if (activeTool === "note") {
      const newItem: NoteItem = {
        id: crypto.randomUUID(),
        type: "note",
        title: "New Note",
        content: "Double click to edit...",
        x: worldPos.x - 100,
        y: worldPos.y - 50,
        customColor: selectedColor !== "zinc" ? selectedColor : undefined,
      };
      onCreate(newItem);
      setActiveTool("cursor");
      e.stopPropagation();
    } else if (activeTool === "text") {
      const newItem: TextItem = {
        id: crypto.randomUUID(),
        type: "text",
        content: "Type here...",
        x: worldPos.x,
        y: worldPos.y - 12,
        color: selectedColor,
      };
      onCreate(newItem);
      setActiveTool("cursor");
      e.stopPropagation();
    } else if (activeTool === "pencil") {
      setIsDrawing(true);
      setPreviewPencil({
        id: "preview-pencil",
        type: "pencil",
        x: 0, y: 0, // Not used for pencil rendering logic specifically but needed for BaseItem
        points: [{ x: worldPos.x, y: worldPos.y }],
        color: selectedColor
      });
      e.stopPropagation();
    } else if (["line", "circle", "arrow"].includes(activeTool)) {
      setIsDrawing(true);
      setPreviewShape({
        id: "preview",
        type: activeTool as ShapeItem["type"],
        x: worldPos.x,
        y: worldPos.y,
        endX: worldPos.x,
        endY: worldPos.y,
        color: selectedColor
      });
      e.stopPropagation();
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (readOnly) return;
    const container = e.currentTarget as HTMLDivElement;
    const rect = container.getBoundingClientRect();
    const clientX = e.clientX;
    const clientY = e.clientY;
    const worldPos = toWorld(clientX, clientY, rect);

    if (dragState && tempItem) {
      const deltaX = (clientX - dragState.startX) / canvasState.zoom;
      const deltaY = (clientY - dragState.startY) / canvasState.zoom;

      const item = dragState.initialItem;
      let newItem = { ...item };

      if (isShape(newItem)) {
        const diffX = newItem.endX - newItem.x;
        const diffY = newItem.endY - newItem.y;
        const newX = item.x + deltaX;
        const newY = item.y + deltaY;
        newItem = { ...newItem, x: newX, y: newY, endX: newX + diffX, endY: newY + diffY };
      } else if (isPencil(newItem) && isPencil(item)) {
        // Pencil logic: shift all points
        const dx = deltaX;
        const dy = deltaY;
        newItem = {
          ...newItem,
          x: item.x + dx, // Metadata x/y
          y: item.y + dy,
          points: item.points.map(p => ({ x: p.x + dx, y: p.y + dy }))
        }
      } else {
        // Text/Note
        newItem = { ...newItem, x: item.x + deltaX, y: item.y + deltaY };
      }

      setTempItem(newItem);
      e.stopPropagation();
      return;
    }

    if (isDrawing) {
      if (previewShape) {
        setPreviewShape({
          ...previewShape,
          endX: worldPos.x,
          endY: worldPos.y
        });
      }
      if (previewPencil) {
        setPreviewPencil({
          ...previewPencil,
          points: [...previewPencil.points, { x: worldPos.x, y: worldPos.y }]
        });
      }
      e.stopPropagation();
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (readOnly) return;
    if (dragState && tempItem) {
      onUpdate(tempItem);
      setDragState(null);
      setTempItem(null);
    }
    if (isDrawing) {
      if (previewShape) {
        const newItem: ShapeItem = {
          ...previewShape,
          id: crypto.randomUUID(),
        };
        onCreate(newItem);
        setPreviewShape(null);
      }
      if (previewPencil) {
        const newItem: PencilItem = {
          ...previewPencil,
          id: crypto.randomUUID(),
          // Normalize position? For now just keep points absolute.
          x: previewPencil.points[0].x,
          y: previewPencil.points[0].y
        };
        onCreate(newItem);
        setPreviewPencil(null);
      }
      setIsDrawing(false);
    }
  };

  // Handlers for Cards/Text
  const handleNoteUpdate = (id: string, updates: Partial<NoteItem>) => {
    const item = items.find(i => i.id === id);
    if (item && isNote(item)) {
      onUpdate({ ...item, ...updates });
    }
  };
  const handleNoteDelete = (id: string) => {
    onDelete(id);
  };
  const handleTextUpdate = (id: string, newContent: string) => {
    const item = items.find(i => i.id === id);
    if (item && isText(item)) {
      onUpdate({ ...item, content: newContent });
    }
  };

  // Render list: merge items with tempItem
  const renderItems = items.map(item => tempItem && tempItem.id === item.id ? tempItem : item);

  return (
    <div className="w-full h-full relative">
      <InfiniteCanvas
        className={cn(activeTool !== "cursor" && !readOnly && "cursor-crosshair")}
        onPanZoom={handlePanZoom}
      >
        {/* Interaction Layer */}
        <div
          className="absolute inset-0 w-full h-full z-10"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          {/* SVG Layer: Shapes, Lines, Pencil */}
          <svg className="absolute inset-0 w-full h-full overflow-visible pointer-events-none">
            {renderItems.filter(i => isShape(i) || isPencil(i)).map(item => (
              <g key={item.id} className={cn("pointer-events-auto", !readOnly && "cursor-move")}>
                <g
                  data-id={item.id}
                  onMouseDown={(e) => {
                    // Let it bubble to Interaction Layer
                  }}
                >
                  {isShape(item) && item.type === "line" && (
                    <line
                      x1={item.x} y1={item.y} x2={item.endX} y2={item.endY}
                      stroke={getThemeHex(item.color)} strokeWidth="3" strokeLinecap="round"
                      className={cn(!readOnly && "hover:stroke-blue-500 transition-colors")}
                      data-id={item.id}
                    />
                  )}
                  {isShape(item) && item.type === "arrow" && (
                    <>
                      <defs>
                        <marker id={`arrowhead-${item.id}`} markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                          <polygon points="0 0, 10 3.5, 0 7" fill={getThemeHex(item.color)} />
                        </marker>
                      </defs>
                      <line
                        x1={item.x} y1={item.y} x2={item.endX} y2={item.endY}
                        stroke={getThemeHex(item.color)} strokeWidth="3" strokeLinecap="round"
                        markerEnd={`url(#arrowhead-${item.id})`}
                        className={cn(!readOnly && "hover:stroke-blue-500 transition-colors")}
                        data-id={item.id}
                      />
                    </>
                  )}
                  {isShape(item) && item.type === "circle" && (
                    <circle
                      cx={item.x + (item.endX - item.x) / 2}
                      cy={item.y + (item.endY - item.y) / 2}
                      r={Math.sqrt(Math.pow(item.endX - item.x, 2) + Math.pow(item.endY - item.y, 2)) / 2}
                      stroke={getThemeHex(item.color)} strokeWidth="3" fill="transparent"
                      className={cn(!readOnly && "hover:stroke-blue-500 transition-colors")}
                      data-id={item.id}
                    />
                  )}
                  {isPencil(item) && (
                    <polyline
                      points={item.points.map(p => `${p.x},${p.y}`).join(" ")}
                      stroke={getThemeHex(item.color)} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"
                      className={cn(!readOnly && "hover:stroke-blue-500 transition-colors opacity-80")}
                      data-id={item.id}
                    />
                  )}
                </g>
              </g>
            ))}

            {/* Previews */}
            {(isDrawing && previewShape) && (
              <g opacity="0.5">
                {previewShape.type === "line" && (
                  <line
                    x1={previewShape.x} y1={previewShape.y} x2={previewShape.endX} y2={previewShape.endY}
                    stroke={getThemeHex(previewShape.color || selectedColor)} strokeWidth="3" strokeLinecap="round"
                  />
                )}
                {previewShape.type === "arrow" && (
                  <line
                    x1={previewShape.x} y1={previewShape.y} x2={previewShape.endX} y2={previewShape.endY}
                    stroke={getThemeHex(previewShape.color || selectedColor)} strokeWidth="3" strokeLinecap="round"
                  />
                )}
                {previewShape.type === "circle" && (
                  <circle
                    cx={previewShape.x + (previewShape.endX - previewShape.x) / 2}
                    cy={previewShape.y + (previewShape.endY - previewShape.y) / 2}
                    r={Math.sqrt(Math.pow(previewShape.endX - previewShape.x, 2) + Math.pow(previewShape.endY - previewShape.y, 2)) / 2}
                    stroke={getThemeHex(previewShape.color || selectedColor)} strokeWidth="3" fill="transparent"
                  />
                )}
              </g>
            )}
            {(isDrawing && previewPencil) && (
              <polyline
                points={previewPencil.points.map(p => `${p.x},${p.y}`).join(" ")}
                stroke={getThemeHex(previewPencil.color || selectedColor)} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"
                opacity="0.5"
              />
            )}
          </svg>

          {/* DOM Layer: Text & Notes */}
          {renderItems.map((item) => {
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
                    isEditable={!readOnly}
                    onUpdate={!readOnly ? handleNoteUpdate : undefined}
                    onDelete={!readOnly ? handleNoteDelete : undefined}
                  />
                </div>
              );
            }
            if (isText(item)) {
              return (
                <BoardTextInput
                  key={item.id}
                  item={item}
                  readOnly={readOnly}
                  onUpdate={!readOnly ? handleTextUpdate : undefined}
                  getThemeHex={getThemeHex}
                />
              );
            }
            return null;
          })}
        </div>
      </InfiniteCanvas>

      {/* Tool Palette - Only visible if not readOnly */}
      {!readOnly && (
        <div className="absolute bottom-24 md:bottom-8 left-1/2 -translate-x-1/2 z-30 flex flex-col items-center gap-4 animate-in fade-in slide-in-from-bottom-8">
          {/* Color Picker */}
          <div className="flex items-center gap-2 p-2 rounded-full bg-white/90 dark:bg-zinc-900/90 backdrop-blur border border-zinc-200 dark:border-zinc-800 shadow-sm">
            {(Object.keys(COLOR_THEMES) as ColorTheme[]).map(themeKey => (
              <button
                key={themeKey}
                onClick={() => setSelectedColor(themeKey)}
                className={cn(
                  "w-5 h-5 rounded-full border border-black/10 dark:border-white/10 transition-transform hover:scale-110",
                  selectedColor === themeKey && "ring-2 ring-zinc-900 dark:ring-zinc-100 ring-offset-2 dark:ring-offset-zinc-950 scale-110"
                )}
                style={{ backgroundColor: COLOR_THEMES[themeKey].preview }}
                title={COLOR_THEMES[themeKey].label}
              />
            ))}
          </div>

          {/* Tools */}
          <div className="flex items-center gap-2 p-2 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl">
            {[
              { id: "cursor", icon: MousePointer2, label: "Select" },
              { id: "note", icon: StickyNote, label: "Note" },
              { id: "text", icon: Type, label: "Text" },
              { id: "pencil", icon: Pencil, label: "Draw" },
              { id: "line", icon: Minus, label: "Line", style: { transform: "rotate(-45deg)" } },
              { id: "arrow", icon: ArrowRight, label: "Arrow", style: { transform: "rotate(-45deg)" } },
              { id: "circle", icon: CircleIcon, label: "Circle" },
              { id: "eraser", icon: Eraser, label: "Eraser" },
            ].map(tool => (
              <button
                key={tool.id}
                onClick={() => setActiveTool(tool.id as any)}
                className={cn(
                  "p-3 rounded-xl transition-colors relative group/tooltip",
                  activeTool === tool.id
                    ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                    : "text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
                )}
              >
                <tool.icon className="w-5 h-5" style={tool.style} />
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-zinc-900 dark:bg-zinc-100 text-zinc-100 dark:text-zinc-900 text-xs rounded opacity-0 group-hover/tooltip:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                  {tool.label}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}