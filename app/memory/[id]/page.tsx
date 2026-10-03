"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import Image from "next/image";
import { Avatar } from "@/components/ui";
import { useMediaUrl } from "@/hooks/useMediaUrl";
import { timeAgo } from "@/lib/media";

/** Thumbnail that upgrades legacy URLs (hooks can't run in a loop). */
function Thumb({
  item,
  active,
  onSelect,
}: {
  item: { url: string; type: string };
  active: boolean;
  onSelect: () => void;
}) {
  const src = useMediaUrl(item.url);
  return (
    <button
      onClick={onSelect}
      className={`h-16 w-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all ${
        active
          ? "border-[#1c1917]"
          : "border-transparent opacity-60 hover:opacity-100"
      }`}
    >
      {item.type === "video" ? (
        <video src={src} preload="metadata" muted className="h-full w-full object-cover" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      )}
    </button>
  );
}

export default function SingleMemoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user, loading, profile } = useAuth();
  const router = useRouter();
  const [memory, setMemory] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [id, setId] = useState<string | null>(null);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    params.then((p) => setId(p.id));
  }, [params]);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (!id || !user) return;
    getDoc(doc(db, "memories", id))
      .then((snap) => {
        if (snap.exists()) setMemory({ id: snap.id, ...snap.data() });
      })
      .catch(console.error);

    const q = query(
      collection(db, `memories/${id}/comments`),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (s) => {
      const arr: any[] = [];
      s.forEach((d) => arr.push({ id: d.id, ...d.data() }));
      setComments(arr);
    });
    return () => unsub();
  }, [id, user]);

  const post = async () => {
    if (!newComment.trim() || !user || !id) return;
    const text = newComment;
    setNewComment("");
    await addDoc(collection(db, `memories/${id}/comments`), {
      text,
      userId: user.uid,
      userEmail: user.email,
      userName: profile?.displayName || user.displayName || user.email?.split("@")[0],
      userPhoto: profile?.photoURL || user.photoURL || null,
      createdAt: serverTimestamp(),
    });
  };

  const mediaList: Array<{ url: string; type: string }> =
    memory?.media || (memory ? [{ url: memory.mediaUrl, type: memory.mediaType }] : []);
  const current = mediaList[index] || mediaList[0];
  const currentSrc = useMediaUrl(current?.url);
  const date = memory?.createdAt?.toDate?.() || new Date();

  if (!memory) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-24">
        <div className="card overflow-hidden">
          <div className="skeleton aspect-video w-full" />
          <div className="space-y-3 p-6">
            <div className="skeleton h-6 w-1/2 rounded-full" />
            <div className="skeleton h-4 w-3/4 rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative z-10 mx-auto max-w-5xl">
      <button
        onClick={() => router.back()}
        className="mb-4 text-sm font-medium text-[#78716c] hover:text-[#1c1917]"
      >
        ← Back
      </button>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Viewer */}
        <div className="lg:col-span-2">
          <div className="overflow-hidden rounded-[20px] border border-[#e8e1d5] bg-black">
            {current?.type === "video" ? (
              <video
                key={currentSrc}
                src={currentSrc}
                controls
                playsInline
                preload="metadata"
                className="max-h-[70vh] w-full object-contain"
              />
            ) : (
              <div className="relative max-h-[70vh] min-h-[320px] w-full">
                {currentSrc && (
                  <Image
                    key={currentSrc}
                    src={currentSrc}
                    alt={memory.caption || "Memory"}
                    width={1400}
                    height={1000}
                    sizes="(max-width: 1024px) 100vw, 65vw"
                    quality={80}
                    priority
                    className="h-auto max-h-[70vh] w-full object-contain"
                  />
                )}
              </div>
            )}
          </div>

          {mediaList.length > 1 && (
            <div className="scrollbar-hide mt-3 flex gap-2 overflow-x-auto pb-1">
              {mediaList.map((m, i) => (
                <Thumb key={i} item={m} active={i === index} onSelect={() => setIndex(i)} />
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <aside className="flex flex-col overflow-hidden rounded-[20px] border border-[#e8e1d5] bg-white">
          <div className="border-b border-[#f3efe7] p-5">
            <p className="text-xs text-[#a8a29e]">
              {date.toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
            </p>
            {memory.eventName && (
              <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl leading-tight">
                {memory.eventName}
              </h1>
            )}
            {memory.caption && (
              <p className="mt-2 text-[15px] leading-relaxed text-[#44403c]">{memory.caption}</p>
            )}
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(memory.tags || []).map((t: string) => (
                <span key={t} className="rounded-full bg-[#f3efe7] px-2.5 py-1 text-xs text-[#57534e]">
                  #{t}
                </span>
              ))}
            </div>
            <p className="mt-3 text-[13px] text-[#78716c]">
              Shared by {memory.userEmail?.split("@")[0] || "a friend"}
              {memory.people?.length > 0 && ` · with ${memory.people.join(", ")}`}
            </p>
          </div>

          <div className="max-h-72 flex-1 space-y-4 overflow-y-auto p-5">
            <p className="text-xs font-semibold uppercase tracking-wider text-[#a8a29e]">
              Comments · {comments.length}
            </p>
            {comments.map((c) => (
              <div key={c.id} className="flex gap-2.5">
                <Avatar src={c.userPhoto} name={c.userName || c.userEmail} size={30} />
                <div className="min-w-0">
                  <p className="text-xs">
                    <span className="font-semibold">{c.userName || c.userEmail?.split("@")[0]}</span>{" "}
                    <span className="text-[#a8a29e]">
                      {c.createdAt?.toDate ? timeAgo(c.createdAt.toDate()) : ""}
                    </span>
                  </p>
                  <p className="mt-0.5 rounded-xl rounded-tl-sm bg-[#faf8f4] px-3 py-2 text-sm leading-relaxed">
                    {c.text}
                  </p>
                </div>
              </div>
            ))}
            {comments.length === 0 && (
              <p className="py-6 text-center text-sm italic text-[#a8a29e]">
                No comments yet — say something nice.
              </p>
            )}
          </div>

          <div className="border-t border-[#f3efe7] p-3">
            <div className="flex gap-2">
              <input
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && post()}
                placeholder="Add a comment…"
                className="min-w-0 flex-1 rounded-full border border-[#e8e1d5] bg-[#faf8f4] px-4 py-2.5 text-sm outline-none focus:border-[#1c1917]/40"
              />
              <button
                onClick={post}
                disabled={!newComment.trim()}
                className="shrink-0 rounded-full bg-[#1c1917] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
              >
                Send
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
