"use client";

import React, { useState, useEffect, useRef } from "react";
import { Plus, Hash, Send, User, AtSign, Trash2, Shield } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useUser } from "../auth/UserContext";
import { createClient } from "@/utils/supabase/client";
import { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { useNotifications } from "../notifications/NotificationContext";
import { UserProfileModal } from "@/components/profile/UserProfileModal";

interface Channel {
  id: string;
  name: string;
  description?: string;
  type: 'public' | 'hallway';
  created_by?: string;
}

interface Message {
  id: string;
  channel_id: string;
  user_id: string;
  content: string;
  created_at: string;
  mentions?: string[]; // Array of UUIDs
  user?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface Profile {
  id: string;
  full_name: string;
  avatar_url?: string;
}

export function CommunicationHub() {
  const { currentUser } = useUser();
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [isCreatingChannel, setIsCreatingChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  
  // Mentions State
  const [users, setUsers] = useState<Profile[]>([]);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [showMentions, setShowMentions] = useState(false);
  const [cursorPosition, setCursorPosition] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);
  
  // Hallway State
  const [isHallwayModalOpen, setIsHallwayModalOpen] = useState(false);
  const [hallwaySearch, setHallwaySearch] = useState("");

  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const isModerator = currentUser?.role === "moderator";

  const { unreadCounts, markAsRead } = useNotifications();

  // Toast auto-clear
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // 1. Fetch Channels & Users
  useEffect(() => {
    const fetchChannels = async () => {
      const { data } = await supabase.from('channels').select('*').order('created_at', { ascending: true });
      if (data) {
        setChannels(data as any);
        if (data.length > 0 && !activeChannelId) {
             const general = data.find((c: any) => c.name.toLowerCase() === 'general');
             setActiveChannelId(general ? general.id : data[0].id);
        }
      }
    };
    fetchChannels();

    const fetchUsers = async () => {
      const { data } = await supabase.from('profiles').select('id, full_name, avatar_url');
      if (data) setUsers(data);
    };
    fetchUsers();

    const channelSub = supabase.channel('channels_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'channels' }, (payload) => {
        if (payload.eventType === 'INSERT') {
            setChannels(prev => {
                if (prev.some(c => c.id === payload.new.id)) return prev;
                return [...prev, payload.new as Channel];
            });
        } else if (payload.eventType === 'DELETE') {
            setChannels(prev => prev.filter(c => c.id !== payload.old.id));
            if (activeChannelId === payload.old.id) setActiveChannelId(null);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(channelSub); };
  }, []);

  // 2. Fetch Messages for Active Channel
  useEffect(() => {
    if (!activeChannelId) return;

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
        const { data: userData } = await supabase.from('profiles').select('full_name, avatar_url').eq('id', payload.new.user_id).single();
        const newMsg = { ...payload.new, user: userData } as Message;
        setMessages(prev => [...prev, newMsg]);
        if (payload.new.channel_id === activeChannelId) markAsRead(activeChannelId);
      })
      .subscribe();

    return () => { supabase.removeChannel(messageSub); };
  }, [activeChannelId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleCreateChannel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    const { error } = await supabase.from('channels').insert({ name: newChannelName, created_by: currentUser.id });
    if (error) alert(error.message);
    setIsCreatingChannel(false);
    setNewChannelName("");
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setNewMessage(val);
    const pos = e.target.selectionStart || 0;
    setCursorPosition(pos);
    const textBeforeCursor = val.slice(0, pos);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');
    if (lastAtPos !== -1) {
      const prevChar = lastAtPos === 0 ? ' ' : textBeforeCursor[lastAtPos - 1];
      if (prevChar === ' ' || prevChar === '\n') {
        const query = textBeforeCursor.slice(lastAtPos + 1);
        if (!query.includes(' ')) {
          setMentionQuery(query);
          setShowMentions(true);
          return;
        }
      }
    }
    setShowMentions(false);
    setMentionQuery(null);
  };

  const insertMention = (user: Profile) => {
    const textBeforeCursor = newMessage.slice(0, cursorPosition);
    const lastAtPos = textBeforeCursor.lastIndexOf('@');
    const textAfterCursor = newMessage.slice(cursorPosition);
    const newText = newMessage.slice(0, lastAtPos) + `@${user.full_name} ` + textAfterCursor;
    setNewMessage(newText);
    setShowMentions(false);
    setMentionQuery(null);
    setTimeout(() => inputRef.current?.focus(), 0);
  };

  const filteredUsers = mentionQuery !== null
    ? users.filter(u => u.full_name.toLowerCase().includes(mentionQuery.toLowerCase()))
    : [];

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (showMentions && e.key === "Enter") {
      if (filteredUsers.length === 1) {
        e.preventDefault();
        insertMention(filteredUsers[0]);
      } else if (filteredUsers.length === 0 && mentionQuery && mentionQuery.length > 0) {
        e.preventDefault();
        setToast("No user found");
        setShowMentions(false);
        setMentionQuery(null);
      }
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !activeChannelId) return;
    const msgContent = newMessage;
    const mentionedIds = users.filter(u => msgContent.includes(`@${u.full_name}`)).map(u => u.id);
    setNewMessage("");
    const { error } = await supabase.from('messages').insert({
      channel_id: activeChannelId,
      user_id: currentUser.id,
      content: msgContent,
      mentions: mentionedIds
    });
    if (error) {
      console.error(error);
      setNewMessage(msgContent);
    }
  };

  const startHallwayChat = async (targetUser: Profile) => {
    const { data: channelData, error: channelError } = await supabase.from('channels').insert({
      name: `${targetUser.full_name}`,
      type: 'hallway',
      created_by: currentUser.id
    }).select().single();

    if (channelError) return;

    await supabase.from('channel_participants').insert([
      { channel_id: channelData.id, user_id: currentUser.id },
      { channel_id: channelData.id, user_id: targetUser.id }
    ]);

    // setChannels(prev => [...prev, channelData as any]); // Removed to prevent duplicate keys (rely on Realtime)
    setActiveChannelId(channelData.id);
    setIsHallwayModalOpen(false);
  };

  const deleteCurrentChat = async () => {
     if (!activeChannelId) return;
     if (confirm("End this private chat? It will be deleted for both participants.")) {
         await supabase.from('channels').delete().eq('id', activeChannelId);
     }
  };

  const publicChannels = channels.filter(c => c.type !== 'hallway');
  const allHallwayChats = channels.filter(c => c.type === 'hallway');
  const modChat = allHallwayChats.find(c => c.name === 'Mod Chat');
  const otherHallwayChats = allHallwayChats.filter(c => c.name !== 'Mod Chat');
  
  const activeChannel = channels.find(c => c.id === activeChannelId);

  return (
    <div className="flex h-full w-full gap-6">
      {/* Sidebar */}
      <div className="w-64 flex flex-col gap-6">
        
        {/* Public Channels */}
        <div className="flex flex-col gap-2">
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
            
            {/* Create Channel Input ... */}
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

            <div className="flex flex-col gap-1">
              {publicChannels.map(channel => (
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
                </button>
              ))}
            </div>
        </div>

        {/* Hallway */}
        <div className="flex flex-col gap-2 flex-1 min-h-0">
             <div className="flex items-center justify-between px-2">
              <h2 className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Hallway</h2>
            </div>
            
            <div className="pl-3 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
                {/* Mod Chat Pinned */}
                {modChat && (
                  <button
                    key={modChat.id}
                    onClick={() => setActiveChannelId(modChat.id)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left border mb-2",
                      activeChannelId === modChat.id
                        ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-900 dark:text-indigo-100 border-indigo-200 dark:border-indigo-800"
                        : "bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:border-indigo-200 dark:hover:border-indigo-800"
                    )}
                  >
                    <span className="relative text-indigo-500">
                      <Shield className="w-4 h-4" />
                       {activeChannelId !== modChat.id && unreadCounts[modChat.id] > 0 && (
                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                          {unreadCounts[modChat.id]}
                        </span>
                      )}
                    </span>
                    <span className="truncate font-semibold">Mod Chat</span>
                  </button>
                )}

                <button
                    onClick={() => setIsHallwayModalOpen(true)}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors text-left border border-dashed border-zinc-200 dark:border-zinc-800"
                >
                    <Plus className="w-4 h-4" />
                    <span>Start Chat</span>
                </button>

                {otherHallwayChats.map(channel => (
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
                    <User className="w-3 h-3 opacity-50" />
                     {activeChannelId !== channel.id && unreadCounts[channel.id] > 0 && (
                      <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-blue-500 rounded-full flex items-center justify-center text-[8px] text-white font-bold">
                        {unreadCounts[channel.id] > 9 ? '' : unreadCounts[channel.id]}
                      </span>
                    )}
                  </span>
                  <span className="truncate">{channel.name}</span>
                </button>
              ))}
            </div>
        </div>

      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-h-0 bg-white dark:bg-zinc-900 rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden shadow-sm relative">

        {/* Header */}
        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 backdrop-blur flex justify-between items-center">
          <div className="flex items-center gap-2">
            {activeChannel?.name === 'Mod Chat' ? (
                <Shield className="w-5 h-5 text-indigo-500" />
            ) : activeChannel?.type === 'hallway' ? (
                <User className="w-5 h-5 text-zinc-400" />
            ) : (
                <Hash className="w-5 h-5 text-zinc-400" />
            )}
            
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              {activeChannel?.name || "Select a channel"}
            </h3>
            
            {activeChannel?.type === 'hallway' && activeChannel.name !== 'Mod Chat' && (
                <span className="text-xs text-zinc-400 ml-2 font-normal flex items-center gap-1 bg-zinc-100 dark:bg-zinc-800 px-2 py-0.5 rounded-full">
                    Expires in 3h
                </span>
            )}
          </div>
          
          {activeChannel?.type === 'hallway' && activeChannel.name !== 'Mod Chat' && (
              <button 
                onClick={deleteCurrentChat}
                className="text-xs text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1 rounded transition-colors"
              >
                  End Chat
              </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar relative">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 opacity-50">
              <Hash className="w-12 h-12 mb-2" />
              <p className="text-sm">No messages yet.</p>
            </div>
          ) : (
            messages.map((msg, i) => {
              const isMe = msg.user_id === currentUser.id;
              const showHeader = i === 0 || messages[i - 1].user_id !== msg.user_id || (new Date(msg.created_at).getTime() - new Date(messages[i - 1].created_at).getTime() > 1000 * 60 * 5);
              const renderContent = () => {
                 const parts = msg.content.split(/(@[\w\s]+)/g);
                 return parts.map((part, idx) => {
                    const matchedUser = part.startsWith('@') ? users.find(u => part.trim() === `@${u.full_name}`) : null;
                    if (matchedUser) {
                        return <span key={idx} onClick={() => setViewingUserId(matchedUser.id)} className="bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 rounded px-1 cursor-pointer hover:underline">{part}</span>;
                    }
                    return part;
                 });
              };
              return (
                <div key={msg.id} className={cn("flex gap-3", isMe && "flex-row-reverse")}>
                  {showHeader && (
                    <div className="shrink-0 w-8 h-8 rounded-full bg-zinc-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center">
                      {msg.user?.avatar_url ? <img src={msg.user.avatar_url} className="w-full h-full object-cover" /> : <User className="w-4 h-4 text-zinc-400" />}
                    </div>
                  )}
                  {!showHeader && <div className="w-8 shrink-0" />}
                  <div className={cn("flex flex-col max-w-[70%]", isMe && "items-end")}>
                    {showHeader && (
                      <div className={cn("flex items-baseline gap-2 mb-1", isMe && "flex-row-reverse")}>
                        <span className="text-xs font-bold text-zinc-700 dark:text-zinc-300">{msg.user?.full_name || "Unknown"}</span>
                        <span className="text-[10px] text-zinc-400">{new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    )}
                    <div className={cn("px-4 py-2 rounded-2xl text-sm leading-relaxed", isMe ? "bg-blue-500 text-white rounded-tr-sm" : "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-tl-sm", msg.mentions?.includes(currentUser.id) && !isMe && "ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-zinc-900 bg-indigo-50 dark:bg-indigo-900/20")}>
                      {renderContent()}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
          <AnimatePresence>
            {toast && <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-xs font-medium rounded-full shadow-lg z-50">{toast}</motion.div>}</AnimatePresence>
        </div>

        {showMentions && filteredUsers.length > 0 && (
          <div className="absolute bottom-20 left-4 w-64 bg-white dark:bg-zinc-800 rounded-xl shadow-2xl border border-zinc-200 dark:border-zinc-700 overflow-hidden z-20">
            <div className="px-3 py-2 border-b border-zinc-100 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900/50 text-xs font-medium text-zinc-500 uppercase tracking-wider">Mentioning...</div>
            <div className="max-h-48 overflow-y-auto">
              {filteredUsers.map(u => (
                <button key={u.id} onClick={() => insertMention(u)} className="w-full text-left px-4 py-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-3 transition-colors">
                  <div className="w-6 h-6 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center overflow-hidden text-xs">
                     {u.avatar_url ? <img src={u.avatar_url} className="w-full h-full object-cover"/> : u.full_name[0]}
                  </div>
                  <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{u.full_name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSendMessage} className="p-4 bg-zinc-50 dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 z-10 relative">
          <div className="relative">
            <input ref={inputRef} value={newMessage} onChange={handleInputChange} onKeyDown={handleKeyDown} placeholder={`Message #${activeChannel?.name || 'channel'}`} className="w-full pl-4 pr-12 py-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all shadow-sm" />
            <button type="submit" disabled={!newMessage.trim() || !activeChannelId} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all"><Send className="w-4 h-4" /></button>
          </div>
        </form>

        <AnimatePresence>
            {isHallwayModalOpen && (
                <div className="absolute inset-0 z-50 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-sm flex flex-col items-center justify-center p-8">
                     <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }} className="w-full max-w-sm bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[400px]">
                        <div className="p-4 border-b border-zinc-100 dark:border-zinc-800">
                             <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 mb-2">New Private Chat</h3>
                             <input autoFocus value={hallwaySearch} onChange={e => setHallwaySearch(e.target.value)} placeholder="Search member..." className="w-full px-3 py-2 bg-zinc-50 dark:bg-zinc-800/50 rounded-lg text-sm outline-none border border-transparent focus:border-zinc-300 dark:focus:border-zinc-700 transition-colors" />
                        </div>
                        <div className="flex-1 overflow-y-auto p-2">
                            {users.filter(u => u.id !== currentUser.id && u.full_name.toLowerCase().includes(hallwaySearch.toLowerCase())).map(user => (
                                <button key={user.id} onClick={() => startHallwayChat(user)} className="w-full flex items-center gap-3 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-xl transition-colors text-left group">
                                    <img src={user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.id}`} className="w-8 h-8 rounded-full bg-zinc-200" />
                                    <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-zinc-100">{user.full_name}</span>
                                </button>
                            ))}
                        </div>
                        <div className="p-3 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
                            <button onClick={() => setIsHallwayModalOpen(false)} className="w-full py-2 text-xs font-medium text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">Cancel</button>
                        </div>
                     </motion.div>
                </div>
            )}
        </AnimatePresence>
      </div>

      {viewingUserId && (
        <UserProfileModal userId={viewingUserId} onClose={() => setViewingUserId(null)} />
      )}
    </div>
  );
}
