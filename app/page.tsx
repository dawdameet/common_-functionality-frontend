"use client";

import { useState } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";

import { BoardCanvas } from "@/components/board/BoardCanvas";

export default function Home() {
  const [activeTab, setActiveTab] = useState("board");

  return (
    <div className="flex min-h-screen bg-zinc-950 text-zinc-400 font-sans selection:bg-zinc-100 selection:text-zinc-900">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      <main className="flex-1 ml-16 md:ml-20 min-h-screen relative overflow-hidden">
        {/* Surface Container */}
        <div className="h-full w-full">
          {activeTab === "board" && <BoardSurface />}
          {activeTab === "scribble" && <ScribbleSurface />}
          {activeTab === "tasks" && <TasksSurface />}
          {activeTab === "comm" && <CommSurface />}
          {activeTab === "ai" && <AISurface />}
        </div>
      </main>
    </div>
  );
}

// Temporary placeholder components for surfaces
function BoardSurface() {
  return (
    <div className="h-full flex flex-col">
      <header className="p-12 pb-0 z-10">
        <h1 className="text-zinc-100 text-3xl font-light tracking-tight">Shared Board</h1>
        <p className="text-zinc-500 mt-2">The canonical reality of your project.</p>
      </header>
      <div className="flex-1 relative">
        <BoardCanvas />
      </div>
    </div>
  );
}

import { Scribblepad } from "@/components/scribble/Scribblepad";

function ScribbleSurface() {
  return (
    <div className="p-12 pb-0 h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-zinc-100 text-3xl font-light tracking-tight">Scribblepad</h1>
        <p className="text-zinc-500 mt-2">Private space for raw cognition.</p>
      </header>
      <div className="flex-1">
        <Scribblepad />
      </div>
    </div>
  );
}

import { TaskBoard } from "@/components/tasks/TaskBoard";

function TasksSurface() {
  return (
    <div className="p-12 pb-0 h-full flex flex-col">
      <header className="mb-12">
        <h1 className="text-zinc-100 text-3xl font-light tracking-tight">Execution Spine</h1>
        <p className="text-zinc-500 mt-2">Decisions in motion.</p>
      </header>
      <div className="flex-1">
        <TaskBoard />
      </div>
    </div>
  );
}

import { CommunicationHub } from "@/components/communication/CommunicationHub";

function CommSurface() {
  return (
    <div className="p-12 pb-12 h-full flex flex-col">
      <header className="mb-8">
        <h1 className="text-zinc-100 text-3xl font-light tracking-tight">Communication</h1>
        <p className="text-zinc-500 mt-2">Contextual, not floating.</p>
      </header>
      <div className="flex-1 min-h-0">
        <CommunicationHub />
      </div>
    </div>
  );
}

import { AILayer } from "@/components/ai/AILayer";



function AISurface() {

  return (

    <div className="p-12 pb-12 h-full flex flex-col">

      <header className="mb-12">

        <h1 className="text-zinc-100 text-3xl font-light tracking-tight">AI Layer</h1>

        <p className="text-zinc-500 mt-2">Silent operator observing and connecting.</p>

      </header>

      <div className="flex-1 overflow-y-auto custom-scrollbar">

        <AILayer />

      </div>

    </div>

  );

}
