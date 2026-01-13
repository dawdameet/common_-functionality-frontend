"use client";

import React, { useState, useEffect } from "react";
import { User, Mail, Briefcase, Building, Shield, X, Camera } from "lucide-react";
import { motion } from "framer-motion";
import { createClient } from "@/utils/supabase/client";

interface UserProfileModalProps {
  userId: string;
  onClose: () => void;
}

interface ProfileData {
  id: string;
  full_name: string;
  avatar_url?: string;
  role: string;
  department?: string;
  bio?: string;
  status?: string;
}

export function UserProfileModal({ userId, onClose }: UserProfileModalProps) {
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      
      if (data) {
        setProfile({
          id: data.id,
          full_name: data.full_name || "Unknown",
          avatar_url: data.avatar_url,
          role: data.role || "general",
          department: data.department || "Product & Strategy",
          bio: data.bio || "No bio yet.",
          status: data.status || "Available"
        });
      }
      setLoading(false);
    };
    
    if (userId) {
      fetchProfile();
    }
  }, [userId]);

  if (!userId) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-zinc-900 rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-zinc-200 dark:border-zinc-800 shadow-2xl relative custom-scrollbar"
      >
        {/* Close Button */}
        <button 
            onClick={onClose}
            className="absolute top-4 right-4 z-20 p-2 rounded-full bg-white/50 dark:bg-black/50 hover:bg-white dark:hover:bg-black backdrop-blur transition-colors text-zinc-600 dark:text-zinc-300"
        >
            <X className="w-5 h-5" />
        </button>

        {loading ? (
            <div className="h-64 flex items-center justify-center text-zinc-400">Loading profile...</div>
        ) : profile ? (
            <div className="flex flex-col">
                {/* Header Banner */}
                <div className="relative w-full h-32 bg-gradient-to-r from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900 shrink-0" />
                
                <div className="px-8 pb-8 -mt-16 relative">
                    <div className="flex flex-col md:flex-row gap-6 items-start">
                         {/* Avatar */}
                        <div className="w-32 h-32 rounded-full border-4 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 relative overflow-hidden shadow-lg">
                            <img 
                                src={profile.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${profile.id}`} 
                                alt={profile.full_name} 
                                className="w-full h-full object-cover" 
                            />
                             {profile.role === 'moderator' && (
                                <div className="absolute bottom-2 right-2 bg-blue-500 text-white p-1 rounded-full border-2 border-white dark:border-zinc-900 shadow-sm" title="Moderator">
                                    <Shield className="w-4 h-4" />
                                </div>
                            )}
                        </div>

                        <div className="flex-1 pt-2 w-full mt-14 md:mt-0">
                             <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                                        {profile.full_name}
                                    </h2>
                                    <p className="text-zinc-500 dark:text-zinc-400 capitalize flex items-center gap-1.5 mt-1">
                                        <Briefcase className="w-3.5 h-3.5" />
                                        {profile.role} @ {profile.department}
                                    </p>
                                </div>
                             </div>

                             <div className="mt-4 flex flex-wrap gap-3">
                                <div className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 text-xs font-medium flex items-center gap-2 border border-zinc-200 dark:border-zinc-700">
                                    <Mail className="w-3.5 h-3.5" />
                                    {profile.full_name.toLowerCase().replace(/\s/g, '.')}@common.com
                                </div>
                                <div className="px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2 border border-emerald-100 dark:border-emerald-900/30">
                                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    {profile.status}
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 grid grid-cols-1 gap-6">
                        <div className="p-6 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 border border-zinc-100 dark:border-zinc-800">
                            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 mb-3 flex items-center gap-2">
                                <User className="w-4 h-4 text-zinc-400" />
                                About
                            </h3>
                            <p className="text-sm text-zinc-600 dark:text-zinc-300 leading-relaxed whitespace-pre-wrap">
                                {profile.bio}
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        ) : (
            <div className="p-12 text-center text-zinc-500">Profile not found.</div>
        )}
      </motion.div>
    </div>
  );
}
