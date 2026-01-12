"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { User, Mail, Briefcase, Building, Save, Camera } from "lucide-react";

export function UserProfile() {
  const [isEditing, setIsEditing] = useState(false);
  const [user, setUser] = useState({
    name: "Meet",
    email: "meet@example.com",
    role: "Product Owner",
    department: "Product & Strategy",
    bio: "Focusing on the intersection of design and AI systems.",
    status: "Deep Work"
  });

  const handleSave = () => {
    setIsEditing(false);
    // Persist logic here
  };

  return (
    <div className="max-w-4xl mx-auto w-full h-full flex flex-col gap-8">
      {/* Identity Card */}
      <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-zinc-200 to-zinc-100 dark:from-zinc-800 dark:to-zinc-900" />
        
        <div className="relative flex flex-col md:flex-row gap-6 items-start mt-12">
          <div className="w-32 h-32 rounded-full border-4 border-white dark:border-zinc-900 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center shrink-0 relative group cursor-pointer overflow-hidden">
             {/* Placeholder Avatar */}
             <span className="text-4xl font-bold text-zinc-300 dark:text-zinc-600">{user.name.charAt(0)}</span>
             
             <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
               <Camera className="w-8 h-8 text-white" />
             </div>
          </div>
          
          <div className="flex-1 pt-2 w-full">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{user.name}</h2>
                <p className="text-zinc-500 dark:text-zinc-400">{user.role} @ {user.department}</p>
              </div>
              <button 
                onClick={() => isEditing ? handleSave() : setIsEditing(true)}
                className="px-4 py-2 rounded-full bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                {isEditing ? <Save className="w-4 h-4" /> : <Edit2Icon className="w-4 h-4" />}
                {isEditing ? "Save Changes" : "Edit Profile"}
              </button>
            </div>
            
            <div className="mt-6 flex flex-wrap gap-4">
               <div className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 text-xs font-medium flex items-center gap-2 border border-zinc-200 dark:border-zinc-700">
                 <Mail className="w-3.5 h-3.5" />
                 {user.email}
               </div>
               <div className="px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800/50 text-zinc-600 dark:text-zinc-300 text-xs font-medium flex items-center gap-2 border border-zinc-200 dark:border-zinc-700">
                 <Briefcase className="w-3.5 h-3.5" />
                 {user.role}
               </div>
               <div className="px-3 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 text-xs font-medium flex items-center gap-2 border border-emerald-100 dark:border-emerald-900/30">
                 <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                 {user.status}
               </div>
            </div>
          </div>
        </div>
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Personal Details */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm">
           <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
             <User className="w-5 h-5" />
             Personal Details
           </h3>
           
           <div className="space-y-4">
             <div className="flex flex-col gap-1">
               <label className="text-xs uppercase font-bold text-zinc-400 dark:text-zinc-600">Full Name</label>
               {isEditing ? (
                 <input 
                   type="text" 
                   value={user.name} 
                   onChange={(e) => setUser({...user, name: e.target.value})}
                   className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-500"
                 />
               ) : (
                 <p className="text-sm text-zinc-700 dark:text-zinc-300">{user.name}</p>
               )}
             </div>
             
             <div className="flex flex-col gap-1">
               <label className="text-xs uppercase font-bold text-zinc-400 dark:text-zinc-600">Bio</label>
               {isEditing ? (
                 <textarea 
                   value={user.bio} 
                   onChange={(e) => setUser({...user, bio: e.target.value})}
                   className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-500 resize-none h-24"
                 />
               ) : (
                 <p className="text-sm text-zinc-700 dark:text-zinc-300 leading-relaxed">{user.bio}</p>
               )}
             </div>
           </div>
        </div>

        {/* Organization */}
        <div className="bg-white dark:bg-zinc-900 rounded-3xl p-8 border border-zinc-200 dark:border-zinc-800 shadow-sm">
           <h3 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mb-6 flex items-center gap-2">
             <Building className="w-5 h-5" />
             Organization Context
           </h3>
           
           <div className="space-y-4">
             <div className="flex flex-col gap-1">
               <label className="text-xs uppercase font-bold text-zinc-400 dark:text-zinc-600">Department</label>
               {isEditing ? (
                 <input 
                   type="text" 
                   value={user.department} 
                   onChange={(e) => setUser({...user, department: e.target.value})}
                   className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-500"
                 />
               ) : (
                 <p className="text-sm text-zinc-700 dark:text-zinc-300">{user.department}</p>
               )}
             </div>
             
             <div className="flex flex-col gap-1">
               <label className="text-xs uppercase font-bold text-zinc-400 dark:text-zinc-600">Current Status</label>
               {isEditing ? (
                 <select 
                   value={user.status} 
                   onChange={(e) => setUser({...user, status: e.target.value})}
                   className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 outline-none focus:ring-2 focus:ring-zinc-500"
                 >
                   <option>Deep Work</option>
                   <option>In Meeting</option>
                   <option>Available</option>
                   <option>Offline</option>
                 </select>
               ) : (
                 <p className="text-sm text-zinc-700 dark:text-zinc-300">{user.status}</p>
               )}
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}

function Edit2Icon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
    </svg>
  )
}
