"use client";

import React, { useState } from "react";
import { Card, CardType } from "./Card";

interface BoardItem {
  id: string;
  type: CardType;
  title: string;
  content: string;
  x: number;
  y: number;
}

const initialItems: BoardItem[] = [
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

export function BoardCanvas() {
  const [items] = useState<BoardItem[]>(initialItems);

  return (
    <div className="relative w-full h-full overflow-hidden bg-[radial-gradient(#18181b_1px,transparent_1px)] [background-size:40px_40px]">
      {items.map((item) => (
        <div 
          key={item.id} 
          style={{ 
            position: 'absolute',
            left: item.x,
            top: item.y,
            zIndex: 1
          }}
        >
          <Card 
            id={item.id}
            type={item.type}
            title={item.title}
            content={item.content}
          />
        </div>
      ))}
      
      {/* Decorative background element */}
      <div className="absolute inset-0 pointer-events-none border-[40px] border-zinc-950 opacity-50 shadow-[inset_0_0_100px_rgba(0,0,0,1)]" />
    </div>
  );
}
