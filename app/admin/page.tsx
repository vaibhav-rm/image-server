"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, setDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/config";
import { Avatar } from "@/components/ui";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [requests, setRequests] = useState<any[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checking, setChecking] = useState(true);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.push("/login");
      return;
    }
    if (user.email === "rathodvaibhav401@gmail.com") {
      setIsAdmin(true);
    } else {
      router.push("/home");
    }
    setChecking(false);
  }, [user, loading, router]);

  useEffect(() => {
    if (!isAdmin) return;
    const unsub = onSnapshot(
      query(collection(db, "access_requests"), orderBy("createdAt", "desc")),
      (snap) => setRequests(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );
    fetch("/api/admin/stats")
      .then((r) => r.json())
      .then((d) => d.stats && setStats(d.stats))
      .catch(() => {});
    return () => unsub();
  }, [isAdmin]);

  const approve = async (req: any) => {
    await setDoc(doc(db, "users", req.uid), {
      uid: req.uid,
      email: req.email,
      displayName: req.displayName,
      photoURL: req.photoURL,
      role: "member",
      joinedAt: serverTimestamp(),
    });
    await deleteDoc(doc(db, "access_requests", req.uid));
  };

  if (loading || checking)
    return <div className="pt-24 text-center text-sm text-[#a8a29e]">Checking access…</div>;

  return (
    <div className="relative z-10 mx-auto max-w-4xl">
      <h1 className="font-[family-name:var(--font-display)] text-[32px] font-medium tracking-tight">
        Admin
      </h1>
      <p className="mt-1 text-[15px] text-[#78716c]">Approvals and a quick look at the album.</p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        {[
          { label: "Memories", value: stats?.memories ?? "—" },
          { label: "Members", value: stats?.users ?? "—" },
          { label: "Waiting", value: requests.length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl border border-[#e8e1d5] bg-white px-4 py-4">
            <p className="font-[family-name:var(--font-display)] text-2xl">{s.value}</p>
            <p className="text-xs text-[#a8a29e]">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="card mt-4 p-5 sm:p-6">
        <h2 className="text-[15px] font-semibold">Requests ({requests.length})</h2>
        <div className="mt-4 space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[#faf8f4] p-3.5">
              <div className="flex items-center gap-3">
                <Avatar src={req.photoURL} name={req.displayName || req.email} size={40} />
                <div>
                  <p className="text-sm font-semibold">{req.displayName || "Someone new"}</p>
                  <p className="text-xs text-[#a8a29e]">{req.email}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => approve(req)}
                  className="rounded-full bg-[#1c1917] px-4 py-2 text-[13px] font-semibold text-white"
                >
                  Approve
                </button>
                <button
                  onClick={() => deleteDoc(doc(db, "access_requests", req.id))}
                  className="rounded-full border border-[#e8e1d5] bg-white px-4 py-2 text-[13px] font-medium text-[#78716c]"
                >
                  Decline
                </button>
              </div>
            </div>
          ))}
          {requests.length === 0 && (
            <p className="py-6 text-center text-sm text-[#a8a29e]">All caught up — nobody waiting.</p>
          )}
        </div>
      </div>
    </div>
  );
}
