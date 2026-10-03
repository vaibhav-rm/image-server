"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { usePaginatedMemories } from "@/hooks/usePaginatedMemories";
import { SmartImage } from "@/components/SmartImage";
import { SmartVideo } from "@/components/SmartVideo";
import { EmptyState, Skeleton } from "@/components/ui";

/** Events derived from real memories (grouped by event name) — no mock data. */
export default function EventsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { items, loading: fetching, hasMore, loadMore } = usePaginatedMemories(40);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const events = useMemo(() => {
    const map = new Map<string, { name: string; count: number; cover: { url: string; type: string }; date: Date; id: string }>();
    for (const m of items) {
      const name = (m.eventName || "Untitled").trim() || "Untitled";
      const key = name.toLowerCase();
      const first = m.media[0];
      if (!first) continue;
      const cur = map.get(key);
      if (!cur) {
        map.set(key, { name, count: m.media.length, cover: first, date: m.sortDate, id: m.id });
      } else {
        cur.count += m.media.length;
        if (m.sortDate > cur.date) {
          cur.date = m.sortDate;
          cur.cover = first;
          cur.id = m.id;
        }
      }
    }
    return [...map.values()].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [items]);

  if (loading || !user) return null;

  return (
    <div className="relative z-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-[32px] font-medium tracking-tight sm:text-4xl">
            Events
          </h1>
          <p className="mt-1 text-[15px] text-[#78716c]">Trips, birthdays, late nights — grouped automatically.</p>
        </div>
        <Link href="/upload" className="rounded-full bg-[#1c1917] px-5 py-2.5 text-sm font-semibold text-white">
          + New event
        </Link>
      </div>

      <div className="mt-5">
        {fetching ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card overflow-hidden">
                <Skeleton className="h-48 !rounded-none" />
                <div className="space-y-2 p-5">
                  <Skeleton className="h-5 w-2/3 rounded-full" />
                  <Skeleton className="h-4 w-1/3 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : events.length === 0 ? (
          <EmptyState
            title="No events yet"
            hint="Name your uploads (like “Goa weekend”) and they’ll gather here on their own."
            action={
              <Link href="/upload" className="rounded-full bg-[#1c1917] px-5 py-3 text-sm font-semibold text-white">
                Add the first one
              </Link>
            }
          />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((e) => (
                <article
                  key={e.name}
                  onClick={() => router.push(`/memory/${e.id}`)}
                  className="card-hover cursor-pointer overflow-hidden rounded-[20px] border border-[#e8e1d5] bg-white"
                >
                  <div className="relative h-48">
                    {e.cover.type === "video" ? (
                      <SmartVideo src={e.cover.url} />
                    ) : (
                      <SmartImage src={e.cover.url} alt={e.name} sizes="(max-width: 768px) 100vw, 33vw" />
                    )}
                    <span className="absolute bottom-3 left-3 rounded-full bg-black/60 px-2.5 py-1 text-xs font-medium text-white backdrop-blur">
                      {e.count} item{e.count === 1 ? "" : "s"}
                    </span>
                  </div>
                  <div className="p-5">
                    <h3 className="font-[family-name:var(--font-display)] text-xl leading-snug">{e.name}</h3>
                    <p className="mt-1 text-[13px] text-[#a8a29e]">
                      {e.date.toLocaleDateString(undefined, { month: "long", year: "numeric" })}
                    </p>
                  </div>
                </article>
              ))}
            </div>
            {hasMore && (
              <div className="py-8 text-center">
                <button onClick={loadMore} className="rounded-full border border-[#e8e1d5] bg-white px-5 py-2.5 text-sm font-medium hover:border-[#1c1917]/30">
                  Show more events
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
