"use client";

import { useAuth } from "@/context/AuthContext";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";

export default function PendingPage() {
  const { user, logOut } = useAuth();
  
  if (!user) return null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-dih-bg relative overflow-hidden">
         <div className="absolute inset-0 z-0">
             <div className="absolute top-[-20%] left-[-20%] w-[50%] h-[50%] bg-red-500/10 blur-[150px] rounded-full animate-pulse" />
        </div>

        <GlassCard className="max-w-lg w-full text-center p-12 border-red-500/20">
             <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
             >
                 <div className="w-20 h-20 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/50">
                     <span className="text-3xl">🔒</span>
                 </div>
                 
                 <h1 className="text-3xl font-orbitron font-bold text-white mb-2">ACCESS RESTRICTED</h1>
                 <p className="font-space text-dih-fg/60 mb-8">
                     Your request has been logged, <span className="text-dih-primary">{user.displayName || user.email}</span>.
                 </p>
                 <p className="text-dih-fg/60 font-space mb-8">
                     This vault is for the Gang only. Wait for an admin to approve your access.
                 </p>
                 
                 <button 
                    onClick={logOut}
                    className="px-6 py-3 border border-dih-fg/20 rounded-lg hover:bg-white/5 transition-colors font-space text-sm"
                 >
                     LOG OUT
                 </button>
             </motion.div>
        </GlassCard>
    </div>
  );
}
