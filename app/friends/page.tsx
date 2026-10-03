"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { collection, query, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "@/firebase/config";
import { Avatar, EmptyState, Skeleton } from "@/components/ui";

export default function FriendsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, "users"), orderBy("joinedAt", "desc"), limit(100)))
      .then((snap) => setMembers(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(console.error)
      .finally(() => setFetching(false));
  }, [user]);

  if (loading || !user) return null;

  return (
    <div className="relative z-10">
      <h1 className="font-[family-name:var(--font-display)] text-[32px] font-medium tracking-tight sm:text-4xl">
        The gang
      </h1>
      <p className="mt-1 text-[15px] text-[#78716c]">
        {members.length > 0 ? `${members.length} friend${members.length === 1 ? "" : "s"} in the album` : "Everyone with access to this album."}
      </p>

      <div className="mt-5">
        {fetching ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className="card flex flex-col items-center p-6">
                <Skeleton className="h-20 w-20 !rounded-full" />
                <Skeleton className="mt-4 h-4 w-24 rounded-full" />
                <Skeleton className="mt-2 h-3 w-16 rounded-full" />
              </div>
            ))}
          </div>
        ) : members.length === 0 ? (
          <EmptyState title="Just you here for now" hint="As friends get approved, they’ll show up here." />
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {members.map((m) => (
              <div key={m.id} className="card flex flex-col items-center p-6 text-center">
                <Avatar src={m.photoURL} name={m.displayName || m.email} size={72} />
                <h3 className="mt-3 max-w-full truncate text-[15px] font-semibold">
                  {m.displayName || m.email?.split("@")[0] || "Friend"}
                </h3>
                <p className="mt-0.5 text-xs capitalize text-[#a8a29e]">
                  {m.role || "member"}
                  {m.joinedAt?.toDate ? ` · since ${m.joinedAt.toDate().toLocaleDateString(undefined, { month: "short", year: "numeric" })}` : ""}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
