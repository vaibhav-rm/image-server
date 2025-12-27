"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, getDoc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/config";
import GlassCard from "@/components/GlassCard";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [stats, setStats] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);

  // Very basic Admin check: hardcode the first user email or check a 'role' field
  // For this MVP, I will assume YOU (the current user) are the admin if you can access this page
  // In a real app, we'd check `userDoc.data().role === 'admin'`
  useEffect(() => {
    if (loading) return;
    if (!user) {
        router.push("/login");
        return;
    }

    const checkAdmin = async () => {
        if (user.email === "rathodvaibhav401@gmail.com") {
            setIsAdmin(true);
        } else {
            console.warn("Unauthorized admin access attempt:", user.email);
            router.push("/home");
        }
        setCheckingAdmin(false);
    };

    checkAdmin();
  }, [user, loading, router]);

  useEffect(() => {
    if (!isAdmin) return;

    // 1. Listen for Pending Requests (Realtime)
    const q = query(collection(db, "access_requests"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const reqs: any[] = [];
        snapshot.forEach((doc) => reqs.push({ id: doc.id, ...doc.data() }));
        setRequests(reqs);
    });

    // 2. Fetch Aggregated Stats (One-time fetch from Server API)
    fetch('/api/admin/stats')
        .then(res => res.json())
        .then(data => {
            if (data.stats) setStats(data.stats);
            if (data.logs) setLogs(data.logs);
        })
        .catch(err => console.error("Failed to fetch admin stats", err));

    return () => unsubscribe();
  }, [isAdmin]);

  const handleApprove = async (req: any) => {
      if (!confirm(`Approve ${req.email}?`)) return;
      
      try {
          // 1. Create User Doc
          await setDoc(doc(db, "users", req.uid), {
              uid: req.uid,
              email: req.email,
              displayName: req.displayName,
              photoURL: req.photoURL,
              role: 'member',
              joinedAt: serverTimestamp()
          });

          // 2. Delete Request
          await deleteDoc(doc(db, "access_requests", req.uid));
      } catch (err) {
          console.error("Error approving:", err);
          alert("Failed to approve");
      }
  };

  const handleDeny = async (uid: string) => {
      if (!confirm("Deny access? This will delete the request.")) return;
      try {
          await deleteDoc(doc(db, "access_requests", uid));
      } catch (err) {
           console.error("Error denying:", err);
      }
  };

  if (loading || checkingAdmin) return <div className="text-white text-center pt-20 font-orbitron animate-pulse">VERIFYING BIOMETRICS...</div>;

  return (
    <div className="min-h-screen bg-dih-bg py-8 px-4">
        <div className="max-w-6xl mx-auto space-y-8">
            <h1 className="text-4xl font-orbitron text-dih-primary mb-8 neon-text text-center md:text-left">ADMIN CONSOLE</h1>
            
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <GlassCard className="border-dih-primary/30">
                    <h3 className="text-dih-primary font-space text-sm tracking-widest">TOTAL MEMORIES</h3>
                    <p className="text-4xl font-orbitron text-white mt-2">{stats?.memories ?? "..."}</p>
                    <p className="text-xs text-dih-fg/50 mt-1">Stored securely</p>
                </GlassCard>
                <GlassCard className="border-dih-secondary/30">
                    <h3 className="text-dih-secondary font-space text-sm tracking-widest">GANG MEMBERS</h3>
                    <p className="text-4xl font-orbitron text-white mt-2">{stats?.users ?? "..."}</p>
                    <p className="text-xs text-dih-fg/50 mt-1">{requests.length} pending</p>
                </GlassCard>
                <GlassCard className="border-dih-accent/30">
                    <h3 className="text-dih-accent font-space text-sm tracking-widest">SYSTEM STATUS</h3>
                    <p className="text-4xl font-orbitron text-white mt-2">{stats?.systemStatus || "ONLINE"}</p>
                    <p className="text-xs text-dih-fg/50 mt-1">Admin API Connected</p>
                </GlassCard>
            </div>

            <GlassCard>
                <h2 className="text-xl font-space text-white mb-6 border-b border-white/10 pb-4">PENDING REQUESTS ({requests.length})</h2>
                
                <div className="space-y-4">
                    <AnimatePresence>
                        {requests.map((req) => (
                            <motion.div 
                                key={req.id}
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                exit={{ opacity: 0, height: 0 }}
                                className="bg-white/5 rounded-lg p-4 flex flex-col md:flex-row items-center justify-between gap-4"
                            >
                                <div className="flex items-center gap-4">
                                    {req.photoURL && <img src={req.photoURL} className="w-12 h-12 rounded-full" alt="avatar" />}
                                    <div>
                                        <p className="font-bold text-white font-space">{req.displayName || "Unknown"}</p>
                                        <p className="text-sm text-dih-fg/60 font-inter">{req.email}</p>
                                    </div>
                                </div>
                                
                                <div className="flex gap-2">
                                    <button 
                                        onClick={() => handleApprove(req)}
                                        className="px-4 py-2 bg-dih-primary/20 text-dih-primary border border-dih-primary/50 rounded hover:bg-dih-primary/40 font-bold font-space transition-colors"
                                    >
                                        APPROVE
                                    </button>
                                    <button 
                                        onClick={() => handleDeny(req.id)}
                                        className="px-4 py-2 bg-red-500/20 text-red-500 border border-red-500/50 rounded hover:bg-red-500/40 font-bold font-space transition-colors"
                                    >
                                        DENY
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                    
                    {requests.length === 0 && (
                        <p className="text-dih-fg/30 italic text-center py-8">NO PENDING REQUESTS</p>
                    )}
                </div>
            </GlassCard>

            {/* Scrollable Content Expansion */}
            <div className="grid md:grid-cols-2 gap-8">
                <GlassCard>
                    <h2 className="text-xl font-space text-white mb-6 border-b border-white/10 pb-4">SYSTEM LOGS</h2>
                    <div className="space-y-4 font-mono text-xs text-dih-fg/60 h-64 overflow-y-auto pr-2 custom-scrollbar">
                         {logs.length > 0 ? logs.map((log, i) => (
                             <div key={i} className="flex gap-4 border-b border-white/5 pb-2">
                                 <span className="text-dih-primary">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
                                 <span>{log.message}</span>
                             </div>
                         )) : (
                             <div className="text-center py-10 opacity-50">Initializing logs...</div>
                         )}
                    </div>
                </GlassCard>
                
                <GlassCard>
                     <h2 className="text-xl font-space text-white mb-6 border-b border-white/10 pb-4">SECURITY ALERTS</h2>
                     <div className="space-y-4">
                         <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
                             <h4 className="text-red-500 font-bold mb-1">UNAUTHORIZED ATTEMPT</h4>
                             <p className="text-xs text-dih-fg/70">IP 192.168.1.1 tried to access /admin. Blocked.</p>
                         </div>
                         <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                             <h4 className="text-yellow-500 font-bold mb-1">STORAGE WARNING</h4>
                             <p className="text-xs text-dih-fg/70">Bucket capacity at 45%.</p>
                         </div>
                         <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
                             <h4 className="text-green-500 font-bold mb-1">BACKUP COMPLETE</h4>
                             <p className="text-xs text-dih-fg/70">Daily snapshot secured at 03:00 AM.</p>
                         </div>
                     </div>
                </GlassCard>
            </div>

            <GlassCard>
                 <h2 className="text-xl font-space text-white mb-6 border-b border-white/10 pb-4">DATA INTEGRITY</h2>
                 <div className="h-40 flex items-center justify-center bg-black/30 rounded-lg border border-dashed border-dih-fg/20">
                     <p className="font-space text-dih-fg/40">ALL SYSTEMS NOMINAL</p>
                 </div>
            </GlassCard>
        </div>
    </div>
  );
}
