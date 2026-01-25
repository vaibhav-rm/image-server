"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState, use } from "react";
import { doc, getDoc, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/config";
import GlassCard from "@/components/GlassCard";
import { motion } from "framer-motion";

import { getProxyUrl } from "@/lib/imageProxy";

export default function SingleMemoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [memory, setMemory] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [unwrappedParams, setUnwrappedParams] = useState<{ id: string } | null>(null);
  
  // Gallery State
  const [currIndex, setCurrIndex] = useState(0);

  useEffect(() => {
    params.then(setUnwrappedParams);
  }, [params]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!unwrappedParams?.id || !user) return;

    const fetchMemory = async () => {
        try {
            const docRef = doc(db, "memories", unwrappedParams.id);
            const docSnap = await getDoc(docRef);
            if (docSnap.exists()) {
                setMemory({ id: docSnap.id, ...docSnap.data() });
            } else {
                console.log("No such memory!");
            }
        } catch (error) {
            console.error("Error fetching memory:", error);
        }
    };

    fetchMemory();

    // Subscribe to comments
    const q = query(collection(db, `memories/${unwrappedParams.id}/comments`), orderBy("createdAt", "asc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const comms: any[] = [];
        snapshot.forEach((doc) => comms.push({ id: doc.id, ...doc.data() }));
        setComments(comms);
    });

    return () => unsubscribe();
  }, [unwrappedParams, user]);

  const handlePostComment = async () => {
      if (!newComment.trim() || !user || !unwrappedParams?.id) return;
      
      await addDoc(collection(db, `memories/${unwrappedParams.id}/comments`), {
          text: newComment,
          userId: user.uid,
          userEmail: user.email, // In a real app, use display name or avatar
          createdAt: serverTimestamp()
      });
      setNewComment("");
  };

  if(!memory) return (
       <div className="min-h-screen flex items-center justify-center bg-black">
          <div className="text-dih-primary animate-pulse font-space">LOADING MEMORY...</div>
      </div>
  );

  // Determine current media item
  const mediaList = memory.media || [{ url: memory.mediaUrl, type: memory.mediaType }];
  const currentMedia = mediaList[currIndex] || mediaList[0];

  return (
    <div className="min-h-screen bg-black text-white relative">
        {/* Background Blur */}
        <div className="absolute inset-0 z-0">
             <div className="absolute inset-0 bg-cover bg-center opacity-30 blur-3xl" style={{ backgroundImage: `url(${getProxyUrl(currentMedia.url)})` }} />
             <div className="absolute inset-0 bg-black/60" />
        </div>

        <div className="relative z-10 min-h-screen flex flex-col md:flex-row">
            {/* Media Section */}
            <div className="flex-1 min-w-0 flex flex-col items-center justify-center p-4 md:p-8 pt-24 md:pt-32 bg-black/40 backdrop-blur-sm relative">
                 <motion.div 
                    key={currIndex} // Re-animate on change
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="max-w-4xl max-h-[70vh] w-full relative group"
                 >
                    {currentMedia.type === 'video' ? (
                        <video src={currentMedia.url} className="w-full h-full max-h-[50vh] md:max-h-[70vh] object-contain rounded-xl shadow-2xl" controls autoPlay loop />
                    ) : (
                        <img src={getProxyUrl(currentMedia.url)} alt={memory.caption} className="w-full h-full max-h-[50vh] md:max-h-[70vh] object-contain rounded-xl shadow-2xl" />
                    )}
                 </motion.div>

                 {/* Gallery Thumbnails */}
                 {mediaList.length > 1 && (
                     <div className="mt-6 flex gap-2 overflow-x-auto w-full max-w-full px-4 pb-2 scrollbar-hide">
                         {mediaList.map((item: any, idx: number) => (
                             <button
                                key={idx}
                                onClick={() => setCurrIndex(idx)}
                                className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${currIndex === idx ? 'border-dih-primary scale-110' : 'border-white/10 hover:border-white/50 opacity-60 hover:opacity-100'}`}
                             >
                                 {item.type === 'video' ? (
                                     <video src={item.url} className="w-full h-full object-cover" />
                                 ) : (
                                     <img src={getProxyUrl(item.url)} className="w-full h-full object-cover" />
                                 )}
                             </button>
                         ))}
                     </div>
                 )}
            </div>

            {/* Sidebar / Details */}
            <div className="w-full md:w-[400px] bg-black/60 backdrop-blur-md border-l border-white/10 flex flex-col flex-1 min-h-[50vh] md:h-screen md:min-h-0 pt-0 md:pt-24">
                <div className="p-6 border-b border-white/10">
                     <button onClick={() => router.back()} className="text-sm font-space text-dih-fg/60 hover:text-white mb-4">← BACK TO TIMELINE</button>
                     
                     {memory.eventName && <h1 className="text-2xl font-orbitron font-bold text-dih-primary mb-1">{memory.eventName}</h1>}
                     <h2 className={`font-space text-white mb-2 ${memory.eventName ? "text-base font-inter text-dih-fg/80" : "text-2xl font-bold font-orbitron"}`}>
                        {memory.caption}
                     </h2>

                     <div className="flex flex-wrap gap-2 mb-4">
                        {memory.tags?.map((tag: string) => (
                            <span key={tag} className="text-xs font-mono text-dih-secondary border border-dih-secondary/30 px-2 py-0.5 rounded">
                                #{tag}
                            </span>
                        ))}
                     </div>
                     <p className="text-sm text-dih-fg/60 font-inter">
                        Caught by: {memory.userEmail} <br/>
                        With: {memory.people?.join(", ")}
                     </p>
                </div>

                {/* Comments */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {comments.map((comment) => (
                        <div key={comment.id} className="flex flex-col">
                            <span className="text-xs text-dih-primary font-bold mb-1">{comment.userEmail?.split('@')[0]}</span>
                            <div className="bg-white/10 p-3 rounded-lg rounded-tl-none font-inter text-sm text-dih-fg">
                                {comment.text}
                            </div>
                        </div>
                    ))}
                    {comments.length === 0 && (
                        <p className="text-center text-dih-fg/30 text-sm font-space italic py-10">
                            Silence in the void... Say something.
                        </p>
                    )}
                </div>

                {/* Input */}
                <div className="p-4 border-t border-white/10 bg-black/20">
                    <div className="flex gap-2">
                        <input 
                            type="text" 
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-dih-primary transition-colors"
                            placeholder="Add a comment..."
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                        />
                        <button 
                            onClick={handlePostComment}
                            disabled={!newComment.trim()}
                            className="bg-dih-primary text-black px-4 py-2 rounded-lg font-bold font-space text-sm disabled:opacity-50 hover:bg-dih-accent transition-colors"
                        >
                            SEND
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}
