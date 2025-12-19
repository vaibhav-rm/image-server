"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { collection, query, orderBy, limit, onSnapshot } from "firebase/firestore";
import { db } from "@/firebase/config";
import { getProxyUrl } from "@/lib/imageProxy";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [memories, setMemories] = useState<any[]>([]);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;

    // Fetch recent memories for the drifting hero
    const q = query(collection(db, "memories"), orderBy("createdAt", "desc"), limit(12));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const items = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setMemories(items);
    });

    return () => unsubscribe();
  }, [user]);

  if (loading || !user) return null;

  return (
    <div className="min-h-screen relative overflow-hidden bg-dih-bg text-dih-fg selection:bg-dih-primary selection:text-black">
      
      {/* Hero Grid Container */}
      <div className="w-full h-full px-4 pb-32 max-w-7xl mx-auto">
         <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 auto-rows-[250px] md:auto-rows-[300px]">
             {/* Main Hero Tile - Spans 2x2 on Desktop, 2x1 on Mobile */}
            {memories.length > 0 && (
                <div className="col-span-2 row-span-2 relative group rounded-2xl overflow-hidden border border-white/10 cursor-pointer" onClick={() => router.push(`/memory/${memories[0].id}`)}>
                    {(() => {
                        const media = memories[0].media?.[0] || { url: memories[0].mediaUrl, type: memories[0].mediaType };
                         return media?.type === 'video' ? (
                            <video src={media.url} autoPlay muted loop playsInline className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                         ) : (
                            <img src={getProxyUrl(media?.url)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                         );
                    })()}
                     <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-6">
                        <span className="text-dih-accent text-xs font-bold tracking-widest mb-2">LATEST MEMORY</span>
                        <h2 className="text-2xl md:text-4xl font-orbitron text-white">{memories[0].eventName || "Untitled Event"}</h2>
                        <p className="text-dih-fg/80 line-clamp-2 mt-2 font-inter text-sm">{memories[0].caption}</p>
                    </div>
                </div>
            )}

            {/* Sub Tiles */}
            {memories.slice(1, 7).map((mem, i) => (
                <div key={mem.id} className={`relative group rounded-2xl overflow-hidden border border-white/10 cursor-pointer ${i === 2 || i === 5 ? 'md:col-span-2' : ''}`} onClick={() => router.push(`/memory/${mem.id}`)}>
                     {(() => {
                        const media = mem.media?.[0] || { url: mem.mediaUrl, type: mem.mediaType };
                         return media?.type === 'video' ? (
                            <video src={media.url} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                         ) : (
                            <img src={getProxyUrl(media?.url)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-500" />
                         );
                    })()}
                     <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center p-4">
                        <p className="font-orbitron text-center text-white font-bold">{mem.eventName || "Memory"}</p>
                    </div>
                </div>
            ))}
         </div>
         
         {memories.length === 0 && (
             <div className="flex flex-col items-center justify-center h-[50vh] text-dih-fg/50">
                 <p className="font-space tracking-widest">LOADING MEMORIES...</p>
             </div>
         )}
      </div>

       <div className="absolute bottom-20 left-0 w-full text-center pointer-events-none z-10">
            <p className="text-dih-fg/30 font-space text-xs tracking-[0.2em] animate-pulse mb-2">
                DRIFTING THROUGH MEMORIES...
            </p>
       </div>

       {/* Horizontal Scrollable Strip (More things to scroll) */}
       <div className="absolute bottom-0 left-0 w-full z-40 bg-black/40 backdrop-blur-md border-t border-white/10 p-4">
            <h3 className="text-xs font-orbitron text-dih-primary mb-2 tracking-widest px-4">RECENT CAPTURES</h3>
            <div className="flex gap-4 overflow-x-auto pb-2 px-4 scrollbar-hide">
                {memories.map((mem) => (
                    <div key={mem.id} className="flex-shrink-0 w-48 h-32 relative rounded-lg overflow-hidden border border-white/10 group cursor-pointer" onClick={() => router.push(`/memory/${mem.id}`)}>
                        {(() => {
                             const media = mem.media?.[0] || { url: mem.mediaUrl, type: mem.mediaType };
                             return media?.type === 'video' ? (
                                <video src={media.url} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                             ) : (
                                <img src={getProxyUrl(media?.url)} className="w-full h-full object-cover opacity-70 group-hover:opacity-100 transition-opacity" />
                             );
                        })()}
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black to-transparent">
                            <p className="text-xs font-space text-white truncate">{mem.eventName || mem.caption}</p>
                        </div>
                    </div>
                ))}
            </div>
       </div>

       {/* V2: Recent Activity Ticker (Still kept floating) */}
       <div className="absolute top-24 right-6 z-40 hidden md:block w-72">
           <GlassCard className="p-4 border-dih-white/5 bg-black/40 backdrop-blur-xl">
                <h3 className="text-xs font-orbitron text-dih-secondary mb-3 tracking-widest border-b border-dih-white/10 pb-2">LIVE FEED</h3>
                <div className="space-y-3">
                    {memories.slice(0, 3).map((mem) => (
                         <div key={mem.id} className="flex items-center gap-3 text-xs">
                            <div className="w-1 h-1 bg-dih-primary rounded-full animate-ping" />
                            <span className="text-dih-fg/80 truncate">New upload: <span className="text-white">{mem.eventName || "Untitled"}</span></span>
                        </div>
                    ))}
                </div>
           </GlassCard>
       </div>
    </div>
  );
}


