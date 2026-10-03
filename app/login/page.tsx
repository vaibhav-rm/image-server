"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { user, loading, googleSignIn } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<{ memories: number; users: number } | null>(null);

  useEffect(() => {
    if (!loading && user) router.push("/home");
  }, [user, loading, router]);

  // Real album counts for the welcome line (fails silently offline).
  useEffect(() => {
    fetch("/api/admin/stats")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.stats) setStats({ memories: d.stats.memories, users: d.stats.users });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf8f4] px-6 py-16">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-7 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1c1917] font-[family-name:var(--font-display)] text-[26px] text-[#faf8f4]">
          d
        </div>

        <h1 className="font-[family-name:var(--font-display)] text-[42px] font-medium leading-none tracking-tight">
          dih pics
        </h1>
        <p className="mx-auto mt-4 max-w-xs leading-relaxed text-[#78716c]">
          Our little corner for all the photos and videos — trips, birthdays,
          and the nights we don’t want to forget.
        </p>

        {stats && (stats.memories > 0 || stats.users > 0) && (
          <p className="mt-4 inline-block rounded-full bg-white px-4 py-1.5 text-[13px] font-medium text-[#57534e] shadow-sm ring-1 ring-[#e8e1d5]">
            {stats.memories} {stats.memories === 1 ? "memory" : "memories"}
            {" · "}
            {stats.users} {stats.users === 1 ? "friend" : "friends"}
          </p>
        )}

        <button
          onClick={() => googleSignIn().catch(console.error)}
          className="mt-8 flex w-full items-center justify-center gap-3 rounded-full bg-[#1c1917] px-6 py-4 text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5"
        >
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <path d="M12.545,10.239v3.821h5.445c-0.712,2.315-2.647,3.972-5.445,3.972c-3.332,0-6.033-2.701-6.033-6.032s2.701-6.032,6.033-6.032c1.498,0,2.866,0.549,3.921,1.453l2.814-2.814C17.503,2.988,15.139,2,12.545,2C7.021,2,2.543,6.477,2.543,12s4.478,10,10.002,10c8.396,0,10.249-7.85,9.426-11.748L12.545,10.239z" />
          </svg>
          Continue with Google
        </button>

        <p className="mt-6 text-[13px] text-[#a8a29e]">
          Just for friends — ask the gang for an invite if you’re new.
        </p>
      </div>
    </div>
  );
}
