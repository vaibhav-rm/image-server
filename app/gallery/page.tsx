"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import GlassCard from "@/components/GlassCard";
import { motion, AnimatePresence } from "framer-motion";

import { getProxyUrl } from "@/lib/imageProxy";

type Tab = 'ALL' | 'PHOTOS' | 'VIDEOS' | 'EVENTS';

export default function GalleryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('ALL');
  const [items, setItems] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  if (!loading && !user) {
    router.push("/login");
    return null;
  }

  useEffect(() => {
    if (!user) return;

    const fetchData = async () => {
        setFetching(true);
        try {
            // Fetch All Memories
            const memoriesQuery = query(collection(db, "memories"), orderBy("createdAt", "desc"));
            const memoriesSnap = await getDocs(memoriesQuery);
            
            const processedItems: any[] = [];
            
            memoriesSnap.docs.forEach(doc => {
                const data = doc.data();
                const isEvent = data.media && data.media.length > 1;
                const baseDate = data.createdAt?.toDate() || new Date();

                if (isEvent) {
                    // 1. Add Event Item (For EVENTS tab)
                    processedItems.push({
                        type: 'event',
                        id: doc.id,
                        title: data.eventName || "Untitled Event",
                        coverUrl: data.media[0].url,
                        count: data.media.length,
                        sortDate: baseDate,
                        caption: data.caption
                    });

                    // 2. Add Individual Items (For ALL/PHOTOS/VIDEOS tabs)
                    // We treat them as independent items
                    data.media.forEach((item: any, index: number) => {
                        processedItems.push({
                            type: item.type === 'video' ? 'video' : 'photo',
                            // Create a composite ID so key is unique, but we link to parent
                            id: `${doc.id}_${index}`, 
                            parentId: doc.id, // For navigation
                            mediaUrl: item.url,
                            caption: data.caption, // Inherit caption
                            sortDate: baseDate // Same date
                        });
                    });

                } else {
                    // Single item (Photo or Video)
                    processedItems.push({
                        type: data.mediaType === 'video' ? 'video' : 'photo',
                        id: doc.id,
                        parentId: doc.id,
                        mediaUrl: data.mediaUrl || (data.media && data.media[0]?.url),
                        caption: data.caption,
                        sortDate: baseDate
                    });
                }
            });

            processedItems.sort((a, b) => b.sortDate.getTime() - a.sortDate.getTime());
            setItems(processedItems);
        } catch (error) {
            console.error("Error fetching gallery:", error);
        } finally {
            setFetching(false);
        }
    };

    fetchData();
  }, [user]);

  const filteredItems = items.filter(item => {
      if (activeTab === 'EVENTS') return item.type === 'event';
      
      // For ALL, PHOTOS, VIDEOS -> Exclude events per user request
      if (item.type === 'event') return false;

      if (activeTab === 'ALL') return true; // Events already excluded above
      if (activeTab === 'PHOTOS') return item.type === 'photo';
      if (activeTab === 'VIDEOS') return item.type === 'video';
      return false;
  });

  return (
    <div className="min-h-screen bg-dih-bg py-24 px-4 pb-12">
        <div className="max-w-7xl mx-auto">
            <h1 className="text-4xl font-orbitron text-white mb-8 neon-text text-center md:text-left">
                ARCHIVE
            </h1>

            {/* Tabs */}
            <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
                {['ALL', 'PHOTOS', 'VIDEOS', 'EVENTS'].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab as Tab)}
                        className={`px-6 py-2 rounded-full font-space text-sm transition-all whitespace-nowrap
                            ${activeTab === tab 
                                ? 'bg-dih-primary text-black font-bold shadow-[0_0_15px_#00ffff]' 
                                : 'border border-dih-white/20 text-dih-fg/60 hover:text-white hover:border-dih-white/50'
                            }
                        `}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Grid */}
            {fetching ? (
                 <div className="text-center font-space text-dih-fg/50 animate-pulse mt-20">DECRYPTING ARCHIVES...</div>
            ) : (
                <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                    <AnimatePresence>
                        {filteredItems.map((item) => (
                            <motion.div
                                layout
                                key={item.id}
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                className={`relative group ${item.type === 'event' ? 'col-span-1 md:col-span-2' : ''}`}
                            >
                                <GlassCard 
                                    className="p-0 overflow-hidden h-64 relative border-dih-white/10"
                                    onClick={() => {
                                        if (item.type === 'event') {
                                            router.push(`/memory/${item.id}`);
                                        } else {
                                            // Use parentId if available (for items inside events), else id
                                            router.push(`/memory/${item.parentId || item.id}`);
                                        }
                                    }}
                                >
                                     {item.type === 'event' ? (
                                         <div className="w-full h-full relative">
                                             <img src={getProxyUrl(item.coverUrl) || "https://picsum.photos/seed/event/800/400"} className="w-full h-full object-cover opacity-60 group-hover:opacity-80 transition-opacity" />
                                             <div className="absolute inset-0 flex flex-col justify-center items-center p-4 bg-black/40">
                                                 <h3 className="text-2xl font-orbitron text-dih-secondary uppercase tracking-widest border-b-2 border-dih-secondary mb-2">{item.title}</h3>
                                                 <p className="text-xs font-space text-white">{item.count || 0} ITEMS</p>
                                             </div>
                                         </div>
                                     ) : (
                                        <div className="w-full h-full relative">
                                            {item.type === 'video' ? (
                                                <>
                                                    <video src={item.mediaUrl} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" muted />
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                        <div className="w-10 h-10 bg-white/20 backdrop-blur rounded-full flex items-center justify-center">
                                                            <div className="w-0 h-0 border-l-[10px] border-l-white border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1"></div>
                                                        </div>
                                                    </div>
                                                </>
                                            ) : (
                                                <img src={getProxyUrl(item.mediaUrl)} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                                            )}
                                            
                                            <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/80 to-transparent translate-y-full group-hover:translate-y-0 transition-transform">
                                                <p className="text-xs font-space text-white truncate">{item.caption}</p>
                                            </div>
                                        </div>
                                     )}
                                </GlassCard>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}

            {!fetching && filteredItems.length === 0 && (
                <div className="text-center py-20 text-dih-fg/30 font-space border border-dashed border-dih-fg/10 rounded-xl mt-8">
                    NO ARTIFACTS FOUND
                </div>
            )}
        </div>
    </div>
  );
}
