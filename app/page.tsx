"use client";

import { useState } from "react";
import { Sidebar } from "@/components/navigation/Sidebar";

import { BoardCanvas } from "@/components/board/BoardCanvas";
import { UserProvider, useUser } from "@/components/auth/UserContext";
import { NotificationProvider } from "@/components/notifications/NotificationContext";

export default function Home() {
  return (
    <UserProvider>
      <NotificationProvider>
        <AppShell />
      </NotificationProvider>
    </UserProvider>
  );
}

function AppShell() {
  const [activeTab, setActiveTab] = useState("board");
  const { currentUser } = useUser();

  return (
    <div className="flex min-h-screen bg-white dark:bg-zinc-950 text-zinc-600 dark:text-zinc-400 font-sans selection:bg-zinc-900 selection:text-zinc-100 dark:selection:bg-zinc-100 dark:selection:text-zinc-900 transition-colors duration-300">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 ml-0 md:ml-20 pb-20 md:pb-0 min-h-screen relative overflow-hidden">
        {/* Surface Container */}
        <div className="h-full w-full">
          {activeTab === "board" && <BoardSurface />}
          {activeTab === "scribble" && <ScribbleSurface />}
          {activeTab === "calendar" && <CalendarSurface />}
          {activeTab === "tasks" && <TasksSurface />}
          {activeTab === "comm" && <CommSurface />}
          {activeTab === "team" && <TeamSurface />}
          {activeTab === "profile" && <ProfileSurface />}
        </div>
      </main>
    </div>
  );
}

import { CalendarView } from "@/components/board/CalendarView";

function CalendarSurface() {
  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 relative">
        <CalendarView />
      </div>
    </div>
  );
}

// Temporary placeholder components for surfaces
function BoardSurface() {
  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 relative">
        <BoardCanvas />
      </div>
    </div>
  );
}

import { Scribblepad } from "@/components/scribble/Scribblepad";

function ScribbleSurface() {
  return (
    <div className="h-full flex flex-col relative">
      <header className="absolute top-4 left-4 md:top-12 md:left-12 z-10 pointer-events-none">
        <h1 className="text-zinc-900 dark:text-zinc-100 text-2xl md:text-3xl font-light tracking-tight pointer-events-auto">Scribblepad</h1>
        <p className="text-zinc-500 mt-1 md:mt-2 text-sm md:text-base pointer-events-auto">Private space for raw cognition.</p>
      </header>
      <div className="flex-1 p-4 pt-24 md:p-12 md:pt-32">
        <Scribblepad />
      </div>
    </div>
  );
}

import { TaskBoard } from "@/components/tasks/TaskBoard";
import { PomodoroTimer } from "@/components/tasks/PomodoroTimer";

function TasksSurface() {
  return (
    <div className="p-4 md:p-12 pb-0 h-full flex flex-col">
      <header className="mb-6 md:mb-12 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-zinc-900 dark:text-zinc-100 text-2xl md:text-3xl font-light tracking-tight">Execution Spine</h1>
          <p className="text-zinc-500 mt-1 md:mt-2 text-sm md:text-base">Decisions in motion.</p>
        </div>
        <PomodoroTimer />
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
    <div className="p-4 md:p-12 pb-4 md:pb-12 h-full flex flex-col">
      <header className="mb-4 md:mb-8">
        <h1 className="text-zinc-900 dark:text-zinc-100 text-2xl md:text-3xl font-light tracking-tight">Communication</h1>
        <p className="text-zinc-500 mt-1 md:mt-2 text-sm md:text-base">Contextual, not floating.</p>
      </header>
      <div className="flex-1 min-h-0">
        <CommunicationHub />
      </div>
    </div>
  );
}

import { TeamSurface } from "@/components/team/TeamSurface";
import { UserProfile } from "@/components/profile/UserProfile";

// AI Surface removed for V1

function ProfileSurface() {
  return (
    <div className="p-4 md:p-12 pb-4 md:pb-12 h-full flex flex-col">
      <header className="mb-4 md:mb-8">
        <h1 className="text-zinc-900 dark:text-zinc-100 text-2xl md:text-3xl font-light tracking-tight">User Profile</h1>
        <p className="text-zinc-500 mt-1 md:mt-2 text-sm md:text-base">Manage your identity and context.</p>
      </header>
      <div className="flex-1 overflow-y-auto custom-scrollbar">
        <UserProfile />
      </div>
    </div>
  );
}
