"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@/components/auth/UserContext"; // Assuming this exists per file listing
import { useWebRTC } from "@/hooks/useWebRTC";
import { TransientBoard } from "./TransientBoard";
import { Mic, MicOff, Video, VideoOff, PhoneOff, UserPlus } from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { InviteModal } from "./InviteModal";

interface MeetingRoomProps {
  roomId: string;
}

export function MeetingRoom({ roomId }: MeetingRoomProps) {
  const { currentUser } = useUser();
  const router = useRouter();
  const { localStream, peers } = useWebRTC(roomId, currentUser?.id || "anon");
  
  const [micOn, setMicOn] = useState(true);
  const [camOn, setCamOn] = useState(true);
  const [showInvite, setShowInvite] = useState(false);
  
  // Board State for Saving
  const boardDataRef = useRef<any[]>([]);

  const toggleMic = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => track.enabled = !micOn);
      setMicOn(!micOn);
    }
  };

  const toggleCam = () => {
    if (localStream) {
        localStream.getVideoTracks().forEach(track => track.enabled = !camOn);
        setCamOn(!camOn);
      }
  };

  const handleLeave = async () => {
    // 1. Stop tracks immediately
    localStream?.getTracks().forEach(t => t.stop());

    console.log("Attempting to save board. User:", currentUser?.id);

    if (currentUser) {
        const supabase = createClient();
        const content = {
            title: `Meeting Notes: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`,
            type: 'meeting_snapshot',
            roomId,
            boardData: boardDataRef.current // Use the captured ref data
        };

        console.log("Saving meeting data payload:", JSON.stringify(content).slice(0, 100) + "...");

        const { data, error } = await supabase.from('scribbles').insert({
            owner_id: currentUser.id,
            content: content, 
            is_archived: false
        }).select();

        if (error) {
            console.error("FAILED to save board:", error);
            alert(`Failed to save notes: ${error.message}`);
        } else {
            console.log("Meeting board saved successfully:", data);
        }
    } else {
        console.warn("No user logged in, cannot save board.");
        alert("Warning: You are not logged in. Meeting notes were NOT saved.");
    }

    router.push('/');
  };

  return (
    <div className="flex flex-col h-screen bg-black text-white p-4 gap-4">
      {/* Top Bar: Videos */}
      <div className="flex gap-4 overflow-x-auto h-32 flex-shrink-0 items-center justify-center">
        {/* Local Video */}
        <div className="relative aspect-video h-full bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
            <video 
                ref={video => { if (video && localStream) video.srcObject = localStream }} 
                autoPlay 
                muted 
                playsInline 
                className="w-full h-full object-cover transform -scale-x-100" 
            />
            <div className="absolute bottom-1 left-2 text-[10px] text-zinc-400">You</div>
        </div>

        {/* Remote Peers */}
        {peers.map(peer => (
             <div key={peer.id} className="relative aspect-video h-full bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700">
                <video 
                    ref={video => { if (video) video.srcObject = peer.stream }} 
                    autoPlay 
                    playsInline 
                    className="w-full h-full object-cover" 
                />
                <div className="absolute bottom-1 left-2 text-[10px] text-zinc-400">Peer {peer.id.slice(0,4)}</div>
            </div>
        ))}
      </div>

      {/* Main Area: Board */}
      <div className="flex-1 relative min-h-0">
        <TransientBoard 
            roomId={roomId} 
            onUpdate={(data) => { boardDataRef.current = data; }}
        />
      </div>

      {/* Bottom Controls */}
      <div className="h-16 flex items-center justify-center gap-4">
        <button onClick={toggleMic} className={`p-4 rounded-full ${micOn ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-red-500/20 text-red-500'}`}>
            {micOn ? <Mic size={20} /> : <MicOff size={20} />}
        </button>
        <button onClick={toggleCam} className={`p-4 rounded-full ${camOn ? 'bg-zinc-800 hover:bg-zinc-700' : 'bg-red-500/20 text-red-500'}`}>
            {camOn ? <Video size={20} /> : <VideoOff size={20} />}
        </button>
        
        <div className="w-px h-8 bg-zinc-800 mx-2" />

        <button onClick={() => setShowInvite(true)} className="p-4 rounded-full bg-zinc-800 hover:bg-zinc-700 text-indigo-400">
            <UserPlus size={20} />
        </button>
        <button onClick={handleLeave} className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-full font-medium flex items-center gap-2">
            <PhoneOff size={20} />
            <span>End & Save</span>
        </button>
      </div>
      
      <InviteModal 
        isOpen={showInvite} 
        onClose={() => setShowInvite(false)} 
        currentUserId={currentUser?.id || ""} 
      />
    </div>
  );
}
