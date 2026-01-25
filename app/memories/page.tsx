"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import GlassCard from "@/components/GlassCard";
import { motion } from "framer-motion";

import { getProxyUrl } from "@/lib/imageProxy";

export default function MemoriesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [timelineItems, setTimelineItems] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  if (!loading && !user) {
    router.push("/login");
    return null;
  }

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
        setFetching(true);
        // Independent fetches to prevent one failure from breaking everything
        let memories: any[] = [];
        let userEvents: any[] = [];

        try {
            // 1. Fetch Memories
            const memoriesQuery = query(collection(db, "memories"), orderBy("createdAt", "desc"));
            const memoriesSnap = await getDocs(memoriesQuery);
            memories = memoriesSnap.docs.map(doc => ({
                type: 'memory',
                id: doc.id,
                ...doc.data(),
                sortDate: doc.data().createdAt?.toDate() || new Date()
            }));
        } catch (e) {
            console.error("Failed to fetch memories", e);
        }

        try {
            // 2. Fetch Users (for 'Joined' events)
            const usersQuery = query(collection(db, "users"), orderBy("joinedAt", "desc"));
            const usersSnap = await getDocs(usersQuery);
            userEvents = usersSnap.docs.map(doc => ({
                type: 'join',
                id: doc.id,
                ...doc.data(),
                sortDate: doc.data().joinedAt?.toDate() || doc.data().createdAt?.toDate() || new Date()
            }));
        } catch (e) {
             console.error("Failed to fetch users for timeline", e);
        }

        // 3. Merge & Sort
        const combined = [...memories, ...userEvents];
        combined.sort((a: any, b: any) => b.sortDate - a.sortDate);

        setTimelineItems(combined);
        setFetching(false);
    };

    fetchData();
  }, [user]);

  return (
    <div className="min-h-screen bg-dih-bg py-24 px-4 overflow-y-auto">
      <div className="max-w-2xl mx-auto space-y-12">
         <h1 className="text-4xl font-orbitron text-dih-primary text-center mb-12 neon-text">
             TIMELINE
         </h1>

         {fetching ? (
             <div className="text-center font-space text-dih-fg/50 animate-pulse">LOADING MEMORIES...</div>
         ) : timelineItems.map((item, index) => (
             <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
             >
                {item.type === 'memory' ? (
                    <GlassCard 
                        className="cursor-pointer group"
                        onClick={() => router.push(`/memory/${item.id}`)}
                    >
                        <div className="aspect-video w-full bg-black/50 rounded-lg overflow-hidden mb-4 relative">
                            {/* Resolve main media item */}
                            {(() => {
                                const mainMedia = item.media?.[0] || { url: item.mediaUrl, type: item.mediaType };
                                return mainMedia.type === 'video' ? (
                                    <video 
                                        src={mainMedia.url} 
                                        className="w-full h-full object-cover" 
                                        controls 
                                        playsInline
                                        crossOrigin="anonymous"
                                    />
                                ) : (
                                    <img src={getProxyUrl(mainMedia.url)} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                );
                            })()}
                            
                            <div className="absolute top-2 right-2 flex gap-2 z-10">
                                <span className="bg-black/50 backdrop-blur px-2 py-1 rounded text-xs font-space border border-white/10">
                                    {item.sortDate.toLocaleDateString()}
                                </span>
                                {item.media?.length > 1 && (
                                     <span className="bg-dih-primary/80 text-black px-2 py-1 rounded text-xs font-bold font-space">
                                         +{item.media.length - 1}
                                     </span>
                                )}
                            </div>
                        </div>
                        
                        <div>
                            {item.eventName && (
                                <h3 className="font-orbitron text-dih-primary text-xl mb-1">{item.eventName}</h3>
                            )}
                            <p className={`font-space text-white mb-2 ${item.eventName ? "text-sm text-dih-fg/70" : "text-lg"}`}>
                                {item.caption}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                                {item.tags?.map((tag: string) => (
                                    <span key={tag} className="text-xs text-dih-secondary bg-dih-secondary/10 px-2 py-1 rounded border border-dih-secondary/20">
                                        #{tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </GlassCard>
                ) : (
                    <div className="flex items-center gap-4 py-8 border-l-2 border-dih-accent/20 pl-8 ml-4 relative">
                        <div className="absolute left-[-9px] top-1/2 -translate-y-1/2 w-4 h-4 bg-dih-accent rounded-full shadow-[0_0_10px_#ff00ff]" />
                        <div className="w-12 h-12 rounded-full overflow-hidden border border-dih-accent/50 relative">
                             <img src={item.photoURL || "https://api.dicebear.com/7.x/avataaars/svg"} className="w-full h-full object-cover" />
                        </div>
                        <div>
                            <p className="font-orbitron text-dih-accent">NEW GANG MEMBER</p>
                            <p className="font-space text-white text-lg">
                                <span className="font-bold">{item.displayName || item.email}</span> joined the party.
                            </p>
                            <p className="text-xs text-dih-fg/40 font-inter">{item.sortDate.toLocaleDateString()}</p>
                        </div>
                    </div>
                )}
             </motion.div>
         ))}
      </div>
    </div>
  );
}
