"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  
  // Don't show navbar on login page
  if (pathname === "/login" || pathname === "/pending") return null;
  if (!user) return null;

  const links = [
    { href: "/home", label: "HOME" },
    { href: "/gallery", label: "GALLERY" },
    { href: "/memories", label: "TIMELINE" },
    { href: "/friends", label: "GANG" },
    { href: "/upload", label: "UPLOAD", highlight: true },
  ];

  return (
    <nav className="fixed top-0 left-0 w-full z-50 p-4 md:p-6 pointer-events-none">
      <div className="max-w-7xl mx-auto flex justify-between items-center bg-dih-glass/5 backdrop-blur-md rounded-2xl px-6 py-4 border border-dih-white/5 pointer-events-auto shadow-[0_4px_30px_rgba(0,0,0,0.1)] relative">
         <Link href="/home" className="group z-50 relative">
             <h1 className="font-orbitron text-xl md:text-2xl font-bold tracking-widest text-white group-hover:text-dih-primary transition-colors neon-text">
                DIH PICS
             </h1>
         </Link>

         {/* Desktop Menu */}
         <div className="hidden md:flex gap-8 font-space text-sm items-center">
             {links.map((link) => (
                 <Link 
                    key={link.href} 
                    href={link.href}
                    className={`relative transition-colors duration-300 ${
                        pathname === link.href ? 'text-dih-primary' : 'text-dih-fg/70 hover:text-white'
                    } ${link.highlight ? 'bg-dih-primary/10 px-4 py-2 rounded-lg border border-dih-primary/50 hover:bg-dih-primary/20 hover:shadow-[0_0_15px_rgba(0,255,255,0.3)]' : ''}`}
                 >
                     {link.label}
                     {pathname === link.href && !link.highlight && (
                         <motion.div 
                            layoutId="nav-underline"
                            className="absolute -bottom-1 left-0 right-0 h-0.5 bg-dih-primary shadow-[0_0_5px_#00ffff]" 
                         />
                     )}
                 </Link>
             ))}
         </div>

         {/* Mobile Toggle */}
         <button 
            className="md:hidden z-50 text-dih-primary p-2"
            onClick={() => setIsOpen(!isOpen)}
         >
             <div className="space-y-1.5 w-6">
                 {/* Simple animated hamburger could go here, for now just spans */}
                 <motion.span animate={{ rotate: isOpen ? 45 : 0, y: isOpen ? 6 : 0 }} className="block h-0.5 w-full bg-current origin-center"></motion.span>
                 <motion.span animate={{ opacity: isOpen ? 0 : 1 }} className="block h-0.5 w-full bg-current"></motion.span>
                 <motion.span animate={{ rotate: isOpen ? -45 : 0, y: isOpen ? -6 : 0 }} className="block h-0.5 w-full bg-current origin-center"></motion.span>
             </div>
         </button>

         {/* Mobile Menu Overlay */}
         <AnimatePresence>
             {isOpen && (
                 <motion.div 
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="absolute top-full left-0 right-0 mt-4 p-4 md:hidden bg-black/90 backdrop-blur-xl border border-dih-white/10 rounded-2xl overflow-hidden flex flex-col gap-2 shadow-2xl"
                 >
                     {links.map((link) => (
                         <Link 
                            key={link.href} 
                            href={link.href}
                            onClick={() => setIsOpen(false)}
                            className={`p-4 text-center font-space text-lg transition-all rounded-xl ${
                                pathname === link.href 
                                    ? 'bg-dih-primary/10 text-dih-primary border border-dih-primary/30' 
                                    : 'text-dih-fg hover:bg-white/5 active:bg-white/10'
                            }`}
                         >
                             {link.label}
                         </Link>
                     ))}
                 </motion.div>
             )}
         </AnimatePresence>
      </div>
    </nav>
  );
}
