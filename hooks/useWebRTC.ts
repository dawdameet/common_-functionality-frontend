import { useEffect, useRef, useState } from 'react';
import { createClient } from '@/utils/supabase/client';
import { RealtimeChannel } from '@supabase/supabase-js';

// Types for Signaling
type SignalData = {
  type: 'offer' | 'answer' | 'ice-candidate';
  payload: any;
  from: string;
  to: string;
};

type Peer = {
  id: string; // The user ID or random session ID of the peer
  stream: MediaStream;
  connection: RTCPeerConnection;
};

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:global.stun.twilio.com:3478' },
  ],
};

export function useWebRTC(roomId: string, userId: string) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [peers, setPeers] = useState<Peer[]>([]);
  const peersRef = useRef<Map<string, Peer>>(new Map()); // Keep ref for event callbacks
  const channelRef = useRef<RealtimeChannel | null>(null);
  const supabase = createClient();

  // 1. Initialize Local Media
  useEffect(() => {
    let stream: MediaStream;

    const startMedia = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: true,
        });
        setLocalStream(stream);
      } catch (err) {
        console.error('Error accessing media devices:', err);
      }
    };

    startMedia();

    return () => {
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  // 2. Join Room & Handle Signaling
  useEffect(() => {
    if (!localStream || !roomId || !userId) return;

    const channel = supabase.channel(`meet:${roomId}`, {
      config: {
        broadcast: { self: false },
        presence: { key: userId },
      },
    });

    channelRef.current = channel;

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        // Identify new users (simple mesh logic: connect to everyone who isn't me)
        // In a real robust app, we'd handle "polite peer" logic here.
        // For V1: We'll wait for explicit 'ready' signals or just use presence to trigger offers.
      })
      .on('presence', { event: 'join' }, ({ key, newPresences }) => {
        // A new user joined. 
        // To avoid "Glare" (both sending offers), we use a deterministic rule:
        // The user with the "Higher" ID (lexicographically) initiates the connection.
        newPresences.forEach((presence: any) => {
           if (presence.presence_ref !== userId) {
             const targetId = key;
             // If I am "higher", I initiate.
             if (userId > targetId) {
                 createPeerConnection(targetId, true);
             } else {
                 // I am "lower", I wait for their offer.
                 // But I still need to initialize the peer object so I'm ready to receive.
                 createPeerConnection(targetId, false);
             }
           }
        });
      })
      .on('presence', { event: 'leave' }, ({ key }) => {
        removePeer(key);
      })
      .on('broadcast', { event: 'signal' }, ({ payload }: { payload: SignalData }) => {
        if (payload.to !== userId) return; // Not for me
        handleSignal(payload);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
           await channel.track({ online_at: new Date().toISOString() });
        }
      });

    return () => {
      channel.unsubscribe();
      peersRef.current.forEach((peer) => peer.connection.close());
      setPeers([]);
      peersRef.current.clear();
    };
  }, [localStream, roomId, userId]);

  // --- Helper Functions ---

  const createPeerConnection = async (targetId: string, initiator: boolean) => {
    if (peersRef.current.has(targetId)) return; // Already connected

    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    localStream?.getTracks().forEach((track) => {
      pc.addTrack(track, localStream);
    });

    // Handle incoming tracks
    pc.ontrack = (event) => {
      const stream = event.streams[0];
      if (stream) {
        updatePeerStream(targetId, stream);
      }
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        sendSignal({
          type: 'ice-candidate',
          payload: event.candidate,
          from: userId,
          to: targetId,
        });
      }
    };

    const peerObj: Peer = { id: targetId, connection: pc, stream: new MediaStream() };
    peersRef.current.set(targetId, peerObj);
    // Force update state
    setPeers(Array.from(peersRef.current.values()));

    if (initiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      sendSignal({
        type: 'offer',
        payload: offer,
        from: userId,
        to: targetId,
      });
    }

    return pc;
  };

  const handleSignal = async (data: SignalData) => {
    const { from, type, payload } = data;
    
    // If we don't have a connection yet and it's an offer, create one (non-initiator)
    if (!peersRef.current.has(from) && type === 'offer') {
      await createPeerConnection(from, false);
    }

    const peer = peersRef.current.get(from);
    if (!peer) return;

    try {
      if (type === 'offer') {
        // If we already have a stable connection or are in process, collision might occur.
        // Simple collision handling: if we are "stable", we accept. 
        // If we are "have-local-offer" (we also sent an offer), we need a tie-breaker.
        // For V1 mesh: simple "ignore if I initiated and I'm waiting" might deadlock.
        // Better: Always accept offer if we are not the initiator OR if our ID is 'smaller' (lexicographical).
        // BUT for now, let's just accept offers if we are 'stable' or 'have-remote-offer'.
        
        if (peer.connection.signalingState !== 'stable') {
             // Rollback or ignore? 
             // If we are waiting for an answer, receiving an offer means glare.
             // We can ignore this offer if we are the "impolite" peer (initiator).
             // Let's rely on the simplistic logic:
             // Only createPeerConnection(initiator=true) creates the offer.
             // If we receive an offer, we must be the non-initiator for this pair logic.
             // However, `presence` events might trigger both to be initiators.
             
             // FIX: Only process offer if we are STABLE or HAVE_REMOTE_OFFER (re-negotiation).
             // If we are HAVE_LOCAL_OFFER, it's a glare.
             if (peer.connection.signalingState === 'have-local-offer') {
                 // Glare. Who wins?
                 // Let's assume the one with alphabetical higher ID wins (is impolite).
                 if (userId > from) return; // I win, I ignore your offer. You will answer mine.
             }
        }

        await peer.connection.setRemoteDescription(new RTCSessionDescription(payload));
        const answer = await peer.connection.createAnswer();
        await peer.connection.setLocalDescription(answer);
        sendSignal({
           type: 'answer',
           payload: answer,
           from: userId,
           to: from,
        });
      } else if (type === 'answer') {
        if (peer.connection.signalingState === 'have-local-offer') {
            await peer.connection.setRemoteDescription(new RTCSessionDescription(payload));
        } else {
            console.warn(`Ignored answer from ${from} because state is ${peer.connection.signalingState}`);
        }
      } else if (type === 'ice-candidate') {
        try {
            await peer.connection.addIceCandidate(new RTCIceCandidate(payload));
        } catch (e) {
            console.warn("Error adding ICE:", e);
        }
      }
    } catch (err) {
      console.error('Signaling Error:', err);
    }
  };

  const sendSignal = (data: SignalData) => {
    channelRef.current?.send({
      type: 'broadcast',
      event: 'signal',
      payload: data,
    });
  };

  const updatePeerStream = (id: string, stream: MediaStream) => {
     const peer = peersRef.current.get(id);
     if (peer) {
        peer.stream = stream;
        setPeers(Array.from(peersRef.current.values()));
     }
  };

  const removePeer = (id: string) => {
    const peer = peersRef.current.get(id);
    if (peer) {
      peer.connection.close();
      peersRef.current.delete(id);
      setPeers(Array.from(peersRef.current.values()));
    }
  };

  return { localStream, peers };
}
