"use client";

import { useMemo, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePaginatedMemories, useInfiniteSentinel } from "@/hooks/usePaginatedMemories";
import { MediaTile } from "@/components/MediaTile";
import { EmptyState, Pill, TileSkeleton } from "@/components/ui";

type Tab = "all" | "photos" | "videos";

export default function GalleryPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("all");
  const [q, setQ] = useState("");
  const { items, loading: fetching, loadingMore, hasMore, loadMore } =
    usePaginatedMemories(24);
  const sentinel = useInfiniteSentinel(loadMore, hasMore && !fetching);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return items.filter((m) => {
      if (tab === "photos" && !m.media.some((x) => x.type !== "video")) return false;
      if (tab === "videos" && !m.media.some((x) => x.type === "video")) return false;
      if (tab === "photos" && m.media.length > 0 && m.media.every((x) => x.type === "video")) return false;
      if (!needle) return true;
      const hay = `${m.eventName || ""} ${m.caption || ""} ${(m.tags || []).join(" ")} ${(m.people || []).join(" ")}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [items, tab, q]);

  if (loading || !user) return null;

  return (
    <div className="relative z-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[32px] font-medium tracking-tight sm:text-4xl">
            Gallery
          </h1>
          <p className="mt-1 text-[15px] text-[#78716c]">
            Everything, newest first. Scroll as far as you like — it keeps loading.
          </p>
        </div>
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search trips, people, captions…"
          className="w-full max-w-xs rounded-full border border-[#e8e1d5] bg-white px-4 py-2.5 text-sm outline-none placeholder:text-[#a8a29e] focus:border-[#1c1917]/40 sm:w-64"
        />
      </div>

      <div className="mt-4 flex gap-2">
        <Pill active={tab === "all"} onClick={() => setTab("all")}>All</Pill>
        <Pill active={tab === "photos"} onClick={() => setTab("photos")}>Photos</Pill>
        <Pill active={tab === "videos"} onClick={() => setTab("videos")}>Videos</Pill>
      </div>

      <div className="mt-5">
        {fetching ? (
          <TileSkeleton />
        ) : filtered.length === 0 ? (
          <EmptyState
            title={q ? "Nothing matched that search" : "Nothing here yet"}
            hint={q ? "Try a different name, place, or word from a caption." : "Upload the first photo and it’ll show up here."}
          />
        ) : (
          <>
            <div className="masonry">
              {filtered.map((m, i) => (
                <MediaTile key={m.id} memory={m} eager={i < 4} />
              ))}
            </div>
            <div ref={sentinel} className="py-8 text-center text-sm text-[#a8a29e]">
              {loadingMore ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#e8e1d5] border-t-[#1c1917]" />
                  Loading more…
                </span>
              ) : hasMore ? (
                "Keep scrolling — more on the way"
              ) : (
                "You’ve seen it all."
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
