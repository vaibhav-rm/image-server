"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/GlassCard";
import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs } from "firebase/firestore";
import { db } from "@/firebase/config";
import { motion } from "framer-motion";

export default function FriendsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  if (!loading && !user) {
    router.push("/login");
    return null;
  }

  useEffect(() => {
    if (!user) return;

    const fetchMembers = async () => {
        setFetching(true);
        try {
            const q = query(collection(db, "users"), orderBy("joinedAt", "desc"));
            const snapshot = await getDocs(q);
            const userList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setMembers(userList);
        } catch (error) {
            console.error("Error fetching gang:", error);
        } finally {
            setFetching(false);
        }
    };

    fetchMembers();
  }, [user]);

  return (
    <div className="min-h-screen bg-dih-bg py-24 px-4">
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-12">
                <h1 className="text-4xl font-orbitron text-dih-secondary neon-text">
                    THE GANG
                </h1>
                <button className="px-6 py-2 border border-dih-secondary/50 text-dih-secondary rounded-full hover:bg-dih-secondary hover:text-black transition-all font-space text-sm">
                    + INVITE
                </button>
            </div>

            {fetching ? (
                 <div className="text-center font-space text-dih-fg/50 animate-pulse mt-20">SCANNING BIOMETRICS...</div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {members.map((member, i) => (
                        <motion.div
                            key={member.id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: i * 0.05 }}
                        >
                            <GlassCard className="flex flex-col items-center text-center group border-dih-white/5 hover:border-dih-secondary/30">
                                <div className="w-24 h-24 rounded-full overflow-hidden border-2 border-dih-secondary/20 mb-4 group-hover:scale-110 transition-transform duration-500 relative">
                                    <img src={member.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${member.uid}`} className="w-full h-full object-cover" />
                                    <div className="absolute inset-0 bg-dih-secondary/10 mix-blend-overlay opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                                
                                <h3 className="text-xl font-space text-white mb-1">{member.displayName || "Unknown Agent"}</h3>
                                <p className="text-xs text-dih-fg/50 font-mono mb-4">{member.role === 'admin' ? 'ADMIN' : 'MEMBER'}</p>
                                
                                <div className="w-full border-t border-dih-white/10 pt-4 grid grid-cols-2 gap-2 text-xs font-mono text-dih-fg/70">
                                    <div>
                                        <p className="text-dih-white/30">JOINED</p>
                                        <p>{member.joinedAt?.toDate().toLocaleDateString() || "Unknown"}</p>
                                    </div>
                                    <div>
                                        <p className="text-dih-white/30">STATUS</p>
                                        <p className="text-green-400">ONLINE</p>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    ))}
                </div>
            )}
        </div>
    </div>
  );
}
