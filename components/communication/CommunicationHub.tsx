"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, Hash, Send, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useUser } from "../auth/UserContext";
import { createClient } from "@/utils/supabase/client";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useNotifications } from "../notifications/NotificationContext";

interface Channel {
  id: string;
  name: string;
  description?: string;
}

interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  user?: {
    full_name: string;
    avatar_url?: string;
  };
}

export function CommunicationHub() {
  const { currentUser } = useUser();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");

  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isModerator = currentUser?.role === "moderator";

  const { unreadCounts, markAsRead } = useNotifications();

  // 1. Fetch Channels
  useEffect(() => {
    const fetchChannels = async () => {
      const { data } = await supabase.from('channels').select('*').order('created_at', { ascending: true });
      if (data) {
        setChannels(data);
        if (data.length > 0 && !activeChannelId) {
          setActiveChannelId(data[0].id);
        }
      }
    };
    fetchChannels();

    const channelSub = supabase.channel('channels_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'channels' }, (payload) => {
        setChannels(prev => [...prev, payload.new as Channel]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channelSub); };
  }, []);

  // 2. Fetch Messages for Active Channel
  useEffect(() => {
    if (!activeChannelId) return;

    // Mark as read immediately when entering channel
    markAsRead(activeChannelId);

    const fetchMessages = async () => {
      const { data } = await supabase
        .from('messages')
        .select('*, user:profiles(full_name, avatar_url)')
        .eq('channel_id', activeChannelId)
        .order('created_at', { ascending: true });
      if (data) setMessages(data as any);
    };
    fetchMessages();

    const messageSub = supabase.channel(`messages:${activeChannelId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `channel_id=eq.${activeChannelId}` }, async (payload) => {
        // Fetch user details for the new message to display name/avatar
        const { data: userData } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', payload.new.user_id).single();

        const newMsg = {
          ...payload.new,
          user: userData
        } as Message;

        setMessages(prev => [...prev, newMsg]);

        // Also mark as read if this channel is active (for real-time incoming messages)
        if (payload.new.channel_id === activeChannelId) {
          markAsRead(activeChannelId);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(messageSub); };
  }, [activeChannelId]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;

    const { error } = await supabase.from('channels').insert({
      name: newChannelName,
      created_by: currentUser.id
    });

    if (error) alert(error.message);
    setIsCreatingChannel(false);
    setNewChannelName("");
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannelId) return;

    const msgContent = newMessage;
    setNewMessage(""); // Optimistic clear

    const { error } = await supabase.from('messages').insert({
      channel_id: activeChannelId,
      user_id: currentUser.id,
      content: msgContent
    });

    if (error) {
      console.error(error);
      setNewMessage(msgContent); // Restore on error
    }
  };

  return (
    <div className="flex h-full w-full gap-6">
      {/* Sidebar: Channels */}
      <div className="w-64 flex flex-col gap-4">
        <div className="flex items-center justify-between px-2">
          <h2 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Channels</h2>
          {isModerator && (
            <button
              onClick={() => setIsCreatingChannel(true)}
              className="p-1 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </div>

        {isCreatingChannel && (
          <form onSubmit={handleCreateChannel} className="px-2 mb-2">
            <input
              autoFocus
              value={newChannelName}
              onChange={e => setNewChannelName(e.target.value)}
              onBlur={() => !newChannelName && setIsCreatingChannel(false)}
              placeholder="Channel name..."
              className="w-full px-2 py-1 text-sm bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded outline-none focus:ring-1 ring-zinc-400"
            />
          </form>
        )}

        <div className="flex flex-col gap-1 overflow-y-auto">
          {channels.map(channel => (
            <button
              key={channel.id}
              onClick={() => setActiveChannelId(channel.id)}
              className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left",
                activeChannelId === channel.id
                  ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-500 hover:bg-zinc-50 dark:hover:bg-zinc-900 hover:text-zinc-700 dark:hover:text-zinc-300"
              )}
            >
              <span className="relative">
                <Hash className="w-4 h-4 opacity-50" />
                {activeChannelId !== channel.id && unreadCounts[channel.id] > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                    {unreadCounts[channel.id] > 9 ? '' : unreadCounts[channel.id]}
                  </span>
                )}
              </span>
              {channel.name}
              {activeChannelId !== channel.id && unreadCounts[channel.id] > 0 && (
                <span className="ml-auto text-xs font-semibold text-blue-500">
                  {unreadCounts[channel.id]}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm">

        {/* Header */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur">
          <div className="flex items-center gap-2">
            <Hash className="w-5 h-5 text-zinc-400" />
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {channels.find(c => c.id === activeChannelId)?.name || "Select a channel"}
            </h3>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 opacity-50">
              <Hash className="w-12 h-12 mb-2" />
              <p className="text-sm">No messages yet. Start the conversation!</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.user_id === currentUser.id;
              const showHeader = i === 0 || messages[i - 1].user_id !== msg.user_id || (new Date(msg.created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 1000 * 60 * 5); // 5 min gap

              return (
                <div key={msg.id} className={cn("flex gap-3", isMe && "flex-row-reverse")}>
                  {showHeader && (
                    <div className="shrink-0 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center">
                      {msg.user?.avatar_url ? (
                        <img src={msg.user.avatar_url} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-4 h-4 text-zinc-400" />
                      )}
                    </div>
                  )}
                  {!showHeader && <div className="w-8 shrink-0" />}

                  <div className={cn("flex flex-col max-w-[70%]", isMe && "items-end")}>
                    {showHeader && (
                      <div className={cn("flex items-baseline gap-2 mb-1", isMe && "flex-row-reverse")}>
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">
                          {msg.user?.full_name || "Unknown"}
                        </span>
                        <span className="text-[10px] text-zinc-400">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    )}
                    <div className={cn(
                      "px-4 py-2 rounded-2xl text-sm leading-relaxed",
                      isMe
                        ? "bg-blue-500 text-white rounded-tr-sm"
                        : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-sm"
                    )}>
                      {msg.content}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSendMessage} className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800">
          <div className="relative">
            <input
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              placeholder={`Message #${channels.find(c => c.id === activeChannelId)?.name || 'channel'}`}
              className="w-full pl-4 pr-12 py-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm"
            />
            <button
              type="submit"
              disabled={!newMessage.trim() || !activeChannelId}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}