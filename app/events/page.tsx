"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import GlassCard from "@/components/GlassCard";

// Mock Events for MVP
const EVENTS = [
    { id: 1, title: "Goa Trip 2024", date: "Dec 2024", count: 124, cover: "https://picsum.photos/seed/goa/400/300" },
    { id: 2, title: "Mike's Birthday", date: "Nov 2024", count: 45, cover: "https://picsum.photos/seed/mike/400/300" },
    { id: 3, title: "Hackathon Night", date: "Oct 2024", count: 12, cover: "https://picsum.photos/seed/hack/400/300" },
];

export default function EventsPage() {
  const { user } = useAuth();
  const router = useRouter();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-dih-bg py-24 px-4">
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-end mb-12">
                <h1 className="text-4xl font-orbitron text-dih-secondary neon-text">
                    EVENTS
                </h1>
                <button className="px-6 py-2 border border-dih-secondary text-dih-secondary rounded-full hover:bg-dih-secondary hover:text-black transition-all font-space text-sm">
                    + NEW EVENT
                </button>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {EVENTS.map((event) => (
                    <GlassCard key={event.id} className="p-0 overflow-hidden group cursor-pointer" hoverEffect={true}>
                        <div className="h-48 overflow-hidden relative">
                             <img src={event.cover} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                             <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                             <div className="absolute bottom-4 left-4">
                                 <h3 className="text-xl font-bold font-space text-white">{event.title}</h3>
                                 <p className="text-xs text-dih-fg/70 font-inter">{event.date} • {event.count} MEMORIES</p>
                             </div>
                        </div>
                    </GlassCard>
                ))}
            </div>
        </div>
    </div>
  );
}
