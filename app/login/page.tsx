"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";

export default function LoginPage() {
  const { user, googleSignIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.push("/home");
    }
  }, [user, router]);

  const handleLogin = async () => {
    try {
      await googleSignIn();
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
        {/* Background Animation Layers */}
        <div className="absolute inset-0 z-0">
             <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-dih-primary/20 blur-[120px] rounded-full animate-pulse" />
             <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-dih-secondary/20 blur-[120px] rounded-full animate-pulse delay-1000" />
        </div>

      <div className="z-10 relative pointer-events-auto">
        <GlassCard className="max-w-md w-full text-center p-12 border-dih-glass/30 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <h1 className="text-5xl font-bold font-orbitron mb-2 bg-gradient-to-r from-dih-primary to-dih-secondary bg-clip-text text-transparent drop-shadow-[0_0_10px_rgba(0,255,255,0.3)]">
              Dih Pics
            </h1>
            <p className="text-dih-fg/60 font-space mb-8 text-lg tracking-wide">
              MEMORY VAULT_ [SECURE]
            </p>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleLogin}
              className="group relative px-8 py-4 bg-dih-glass border border-dih-primary/30 rounded-full font-space font-bold tracking-wider text-dih-primary hover:bg-dih-primary/10 hover:border-dih-primary/60 hover:shadow-[0_0_30px_rgba(0,255,255,0.2)] transition-all duration-300 pointer-events-auto cursor-pointer"
            >
              <span className="relative z-10 flex items-center justify-center gap-3">
                 <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                     <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z"/>
                 </svg>
                 INITIATE LOGIN
              </span>
            </motion.button>

             <p className="mt-8 text-xs text-dih-fg/30 font-inter">
                INVITE ONLY PROTOCOL ACTIVE
             </p>
          </motion.div>
        </GlassCard>
      </div>
    </div>
  );
}
