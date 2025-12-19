"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { motion } from "framer-motion";
import GlassCard from "@/components/GlassCard";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { storage, db } from "@/firebase/config";

export default function UploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [dragActive, setDragActive] = useState(false);
  
  // Changed from single file to array
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<{url: string, type: 'image' | 'video'}[]>([]);
  
  const [uploading, setUploading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  // Metadata state
  const [eventName, setEventName] = useState("");
  const [caption, setCaption] = useState("");
  const [tags, setTags] = useState("");
  const [people, setPeople] = useState("");

  if (!loading && !user) {
    router.push("/login");
    return null;
  }

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleFiles = (newFiles: FileList | null) => {
    if (newFiles && newFiles.length > 0) {
      const fileArray = Array.from(newFiles);
      setFiles(prev => [...prev, ...fileArray]);
      
      const newPreviews = fileArray.map(file => ({
        url: URL.createObjectURL(file),
        type: file.type.startsWith("image") ? 'image' : 'video' as 'image' | 'video'
      }));
      setPreviews(prev => [...prev, ...newPreviews]);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    handleFiles(e.dataTransfer.files);
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    handleFiles(e.target.files);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (files.length === 0 || !user) return;
    setUploading(true);

    try {
      // 1. Upload All Files via Server API (Bypasses broken client permissions)
      const uploadPromises = files.map(async (file) => {
         const formData = new FormData();
         formData.append("file", file);
         formData.append("path", `memories/${user.uid}/${Date.now()}_${file.name}`);

         const res = await fetch("/api/upload", {
             method: "POST",
             body: formData
         });

         if (!res.ok) throw new Error("Server upload failed");
         
         const data = await res.json();
         return {
             url: data.url,
             type: file.type.startsWith("image") ? "image" : "video"
         };
      });

      const uploadedMedia = await Promise.all(uploadPromises);

      // 2. Save Metadata to Firestore (New Schema)
      // Firestore usually works fine as it uses different auth path, checking...
      await addDoc(collection(db, "memories"), {
        eventName: eventName || "Untitled Event",
        media: uploadedMedia as any,
        // Legacy support
        mediaUrl: uploadedMedia[0].url, 
        mediaType: uploadedMedia[0].type,
        
        caption,
        tags: tags.split(",").map(t => t.trim()).filter(Boolean),
        people: people.split(",").map(p => p.trim()).filter(Boolean),
        uploadedBy: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp(),
      });

      // 3. Success Animation
      setUploading(false);
      setShowSuccess(true);

      setTimeout(() => {
          router.push("/memories");
      }, 2000);

    } catch (error) {
      console.error("Upload failed", error);
      setUploading(false);
      alert("Upload failed! Server permission issue.");
    }
  };

  return (
    <div className="min-h-screen bg-dih-bg pt-24 px-4 pb-12 relative overflow-hidden">
        {showSuccess && <ParticleBurst />}
        
        <div className="max-w-2xl mx-auto z-10 relative">
            <h1 className="text-4xl font-orbitron text-dih-primary mb-8 text-center neon-text">
                UPLOAD EVENT
            </h1>

            <GlassCard className="p-8">
                {/* Drag & Drop Zone */}
                <div 
                    className={`relative border-2 border-dashed rounded-xl min-h-[160px] flex flex-col items-center justify-center transition-colors duration-300 p-4
                    ${dragActive ? 'border-dih-accent bg-dih-accent/10' : 'border-dih-fg/20 hover:border-dih-primary'}`}
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                >
                    <input 
                        type="file" 
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                        onChange={handleChange}
                        accept="image/*,video/*"
                        multiple // Enable multiple files
                    />
                    
                    {previews.length > 0 ? (
                        <div className="grid grid-cols-3 sm:grid-cols-4 gap-4 w-full relative z-10 pointer-events-none">
                             {/* Preview Grid */}
                             {previews.map((preview, idx) => (
                                 <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-dih-white/20 group pointer-events-auto">
                                     {preview.type === 'video' ? (
                                         <video src={preview.url} className="w-full h-full object-cover" />
                                     ) : (
                                         <img src={preview.url} alt={`Preview ${idx}`} className="w-full h-full object-cover" />
                                     )}
                                     <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            removeFile(idx);
                                        }}
                                        className="absolute top-1 right-1 bg-red-500/80 text-white w-6 h-6 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors opacity-0 group-hover:opacity-100"
                                     >
                                         ×
                                     </button>
                                 </div>
                             ))}
                             {/* Add More Placeholder */}
                             <div className="aspect-square flex flex-col items-center justify-center border-2 border-dashed border-dih-white/10 rounded-lg text-dih-white/30 bg-dih-white/5">
                                 <span className="text-2xl">+</span>
                                 <span className="text-xs">Add</span>
                             </div>
                        </div>
                    ) : (
                        <div className="text-center pointer-events-none">
                            <p className="text-dih-fg/60 font-space mb-2">DRAG & DROP OR CLICK</p>
                            <p className="text-xs text-dih-fg/30 font-inter">Supports Multiple Images & Videos</p>
                        </div>
                    )}
                </div>

                {/* Metadata Form */}
                <div className="mt-8 space-y-6">
                    <div>
                        <label className="block text-dih-primary font-space text-sm mb-2">EVENT NAME</label>
                        <input 
                            type="text" 
                            className="w-full bg-dih-bg/50 border border-dih-white/10 rounded-lg p-3 text-dih-fg focus:outline-none focus:border-dih-primary transition-colors"
                            placeholder="e.g., Backchodi 2025"
                            value={eventName}
                            onChange={(e) => setEventName(e.target.value)}
                        />
                    </div>

                    <div>
                        <label className="block text-dih-fg/80 font-space text-sm mb-2">CAPTION / DESCRIPTION</label>
                        <input 
                            type="text" 
                            className="w-full bg-dih-bg/50 border border-dih-white/10 rounded-lg p-3 text-dih-fg focus:outline-none focus:border-dih-primary transition-colors"
                            placeholder="What happened?"
                            value={caption}
                            onChange={(e) => setCaption(e.target.value)}
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-dih-secondary font-space text-sm mb-2">INSIDE JOKES (TAGS)</label>
                            <input 
                                type="text" 
                                className="w-full bg-dih-bg/50 border border-dih-white/10 rounded-lg p-3 text-dih-fg focus:outline-none focus:border-dih-secondary transition-colors"
                                placeholder="Comma separated"
                                value={tags}
                                onChange={(e) => setTags(e.target.value)}
                            />
                        </div>
                        <div>
                             <label className="block text-dih-accent font-space text-sm mb-2">WHO WAS THERE?</label>
                            <input 
                                type="text" 
                                className="w-full bg-dih-bg/50 border border-dih-white/10 rounded-lg p-3 text-dih-fg focus:outline-none focus:border-dih-accent transition-colors"
                                placeholder="Comma separated"
                                value={people}
                                onChange={(e) => setPeople(e.target.value)}
                            />
                        </div>
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={files.length === 0 || uploading}
                        onClick={handleUpload}
                        className={`w-full py-4 rounded-xl font-bold font-orbitron tracking-widest transition-all shadow-[0_0_20px_rgba(0,0,0,0.3)]
                            ${files.length === 0 || uploading 
                                ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
                                : 'bg-gradient-to-r from-dih-primary via-dih-secondary to-dih-primary bg-[length:200%_auto] animate-gradient text-black hover:shadow-[0_0_30px_rgba(0,255,255,0.4)]'
                            }
                        `}
                    >
                        {uploading ? `UPLOADING ${files.length} FILES...` : "UPLOAD EVENT MEMORY"}
                    </motion.button>
                </div>
            </GlassCard>
        </div>
    </div>
  );
}

const ParticleBurst = () => {
    // Basic particle burst effect
    const particles = Array.from({ length: 20 });
    return (
        <div className="fixed inset-0 pointer-events-none flex items-center justify-center z-50">
            {particles.map((_, i) => (
                <Particle key={i} index={i} />
            ))}
            <motion.div 
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: [0, 1.5, 2], opacity: [0, 1, 0] }}
                transition={{ duration: 0.8, ease: "easeOut" }}
                className="absolute text-dih-accent font-orbitron font-bold text-4xl neon-text"
            >
                MEMORY SECURED
            </motion.div>
        </div>
    );
};

const Particle = ({ index }: { index: number }) => {
    const angle = (index / 20) * 360;
    const distance = 300 + Math.random() * 200;
    const x = Math.cos(angle * (Math.PI / 180)) * distance;
    const y = Math.sin(angle * (Math.PI / 180)) * distance;
    
    return (
        <motion.div
            className="absolute w-2 h-2 bg-dih-primary rounded-full shadow-[0_0_10px_#00ffff]"
            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
            animate={{ 
                x: x, 
                y: y, 
                opacity: 0,
                scale: 0 
            }}
            transition={{ 
                duration: 1 + Math.random(), 
                ease: "easeOut" 
            }}
        />
    )
}
