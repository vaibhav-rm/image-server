"use client";

import { useAuth } from "@/context/AuthContext";

export default function PendingPage() {
  const { user, logOut } = useAuth();
  if (!user) return null;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#faf8f4] px-6">
      <div className="card w-full max-w-md p-10 text-center">
        <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-[#fef0e2] text-2xl">
          <span aria-hidden>☕</span>
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-3xl">You’re on the list</h1>
        <p className="mt-3 leading-relaxed text-[#78716c]">
          Hi {user.displayName || user.email} — your request is with the gang.
          You’ll get in as soon as someone approves it.
        </p>
        <button
          onClick={() => logOut()}
          className="mt-7 w-full rounded-full border border-[#e8e1d5] bg-white py-3 text-sm font-medium hover:border-[#1c1917]/30"
        >
          Log out
        </button>
      </div>
    </div>
  );
}
