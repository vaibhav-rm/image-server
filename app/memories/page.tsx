"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useMemo } from "react";
import { usePaginatedMemories, useInfiniteSentinel } from "@/hooks/usePaginatedMemories";
import { SmartImage } from "@/components/SmartImage";
import { SmartVideo } from "@/components/SmartVideo";
import { EmptyState, TileSkeleton } from "@/components/ui";
import { formatLong, monthKey } from "@/lib/media";

export default function MemoriesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { items, loading: fetching, loadingMore, hasMore, loadMore } =
    usePaginatedMemories(20);
  const sentinel = useInfiniteSentinel(loadMore, hasMore && !fetching);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const groups = useMemo(() => {
    const map = new Map<string, typeof items>();
    for (const m of items) {
      const k = monthKey(m.sortDate);
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(m);
    }
    return [...map.entries()];
  }, [items]);

  if (loading || !user) return null;

  return (
    <div className="relative z-10 mx-auto max-w-3xl">
      <h1 className="font-[family-name:var(--font-display)] text-[32px] font-medium tracking-tight sm:text-4xl">
        Timeline
      </h1>
      <p className="mt-1 text-[15px] text-[#78716c]">The story so far, month by month.</p>

      <div className="mt-6">
        {fetching ? (
          <div className="space-y-4">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card overflow-hidden">
                <div className="skeleton aspect-video w-full" />
                <div className="space-y-2 p-5">
                  <div className="skeleton h-5 w-1/3 rounded-full" />
                  <div className="skeleton h-4 w-2/3 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="The story hasn’t started yet"
            hint="Add your first memory and it’ll appear here on the timeline."
            action={
              <Link href="/upload" className="rounded-full bg-[#1c1917] px-5 py-3 text-sm font-semibold text-white">
                Add a memory
              </Link>
            }
          />
        ) : (
          <div className="space-y-10">
            {groups.map(([month, mems]) => (
              <section key={month}>
                <div className="mb-4 flex items-center gap-3">
                  <h2 className="font-[family-name:var(--font-display)] text-xl italic">{month}</h2>
                  <span className="h-px flex-1 bg-[#e8e1d5]" />
                  <span className="text-xs text-[#a8a29e]">{mems.length}</span>
                </div>
                <div className="space-y-5">
                  {mems.map((m) => {
                    const first = m.media[0];
                    if (!first) return null;
                    return (
                      <article
                        key={m.id}
                        onClick={() => router.push(`/memory/${m.id}`)}
                        className="card-hover cursor-pointer overflow-hidden rounded-[20px] border border-[#e8e1d5] bg-white"
                      >
                        <div className="aspect-video w-full">
                          {first.type === "video" ? (
                            <SmartVideo src={first.url} />
                          ) : (
                            <SmartImage
                              src={first.url}
                              alt={m.caption || m.eventName || "Memory"}
                              sizes="(max-width: 768px) 100vw, 700px"
                            />
                          )}
                        </div>
                        <div className="p-5">
                          <p className="text-xs text-[#a8a29e]">{formatLong(m.sortDate)}</p>
                          {m.eventName && (
                            <h3 className="mt-1 font-[family-name:var(--font-display)] text-[22px] leading-snug">
                              {m.eventName}
                            </h3>
                          )}
                          {m.caption && (
                            <p className="mt-1.5 text-[15px] leading-relaxed text-[#57534e]">{m.caption}</p>
                          )}
                          <div className="mt-3 flex flex-wrap gap-1.5">
                            {(m.tags || []).map((t) => (
                              <span key={t} className="rounded-full bg-[#f3efe7] px-2.5 py-1 text-xs text-[#57534e]">
                                #{t}
                              </span>
                            ))}
                            {m.media.length > 1 && (
                              <span className="rounded-full bg-[#1c1917] px-2.5 py-1 text-xs font-medium text-white">
                                +{m.media.length - 1} more
                              </span>
                            )}
                          </div>
                        </div>
                      </article>
                    );
                  })}
                </div>
              </section>
            ))}
            <div ref={sentinel} className="pb-6 pt-2 text-center text-sm text-[#a8a29e]">
              {loadingMore ? "Loading earlier memories…" : hasMore ? "Scroll for earlier memories" : "Back to the beginning."}
            </div>
          </div>
        )}
      </div>
      {(!fetching && groups.length === 0) && <TileSkeleton />}
    </div>
  );
}
