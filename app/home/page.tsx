"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { usePaginatedMemories, useInfiniteSentinel } from "@/hooks/usePaginatedMemories";
import { MediaTile } from "@/components/MediaTile";
import { SmartImage } from "@/components/SmartImage";
import { SmartVideo } from "@/components/SmartVideo";
import { Eyebrow, TileSkeleton, EmptyState } from "@/components/ui";
import { greeting, timeAgo } from "@/lib/media";

export default function HomePage() {
  const { user, loading, profile } = useAuth();
  const router = useRouter();
  const { items, loading: fetching, loadingMore, hasMore, loadMore } =
    usePaginatedMemories(18);
  const sentinel = useInfiniteSentinel(loadMore, hasMore && !fetching);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  if (loading || !user) return null;

  const [hero, ...rest] = items;
  const heroMedia = hero?.media[0];

  return (
    <div className="relative z-10">
      {/* Welcome */}
      <section className="pb-6 pt-2">
        <Eyebrow>{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</Eyebrow>
        <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
          <h1 className="max-w-xl font-[family-name:var(--font-display)] text-[34px] font-medium leading-[1.05] tracking-tight sm:text-[44px]">
            {greeting()}, {profile?.displayName?.split(" ")[0] || user.displayName?.split(" ")[0] || "friend"}. Here’s what the gang’s been up to.
          </h1>
          <Link
            href="/upload"
            className="rounded-full bg-[#1c1917] px-5 py-3 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5"
          >
            + Add photos
          </Link>
        </div>
      </section>

      {fetching ? (
        <TileSkeleton />
      ) : items.length === 0 ? (
        <EmptyState
          title="No memories yet"
          hint="Be the first to drop a photo or video — the album starts with you."
          action={
            <Link href="/upload" className="rounded-full bg-[#1c1917] px-5 py-3 text-sm font-semibold text-white">
              Add the first one
            </Link>
          }
        />
      ) : (
        <>
          {/* Featured */}
          {hero && heroMedia && (
            <section
              onClick={() => router.push(`/memory/${hero.id}`)}
              className="card-hover mb-5 cursor-pointer overflow-hidden rounded-[24px] border border-[#e8e1d5] bg-white"
            >
              <div className="grid md:grid-cols-5">
                <div className="relative min-h-[260px] sm:min-h-[320px] md:col-span-3 md:min-h-[420px]">
                  {heroMedia.type === "video" ? (
                    <SmartVideo src={heroMedia.url} eager />
                  ) : (
                    <SmartImage
                      src={heroMedia.url}
                      alt={hero.caption || hero.eventName || "Latest memory"}
                      eager
                      sizes="(max-width: 768px) 100vw, 60vw"
                    />
                  )}
                  {hero.media.length > 1 && (
                    <span className="absolute left-4 top-4 rounded-full bg-black/60 px-3 py-1 text-xs font-medium text-white backdrop-blur">
                      {hero.media.length} photos
                    </span>
                  )}
                </div>
                <div className="flex flex-col justify-center p-6 sm:p-8 md:col-span-2">
                  <Eyebrow>Latest · {timeAgo(hero.sortDate)}</Eyebrow>
                  <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-medium leading-tight tracking-tight">
                    {hero.eventName || "A good day"}
                  </h2>
                  {hero.caption && (
                    <p className="mt-3 leading-relaxed text-[#57534e]">{hero.caption}</p>
                  )}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(hero.people || []).slice(0, 4).map((p) => (
                      <span key={p} className="rounded-full bg-[#f3efe7] px-3 py-1 text-xs font-medium text-[#57534e]">
                        {p}
                      </span>
                    ))}
                  </div>
                  <span className="mt-6 text-sm font-semibold text-[#b4540a]">
                    Open memory →
                  </span>
                </div>
              </div>
            </section>
          )}

          {/* Quick stats */}
          <section className="mb-5 grid grid-cols-3 gap-3">
            {[
              { label: "Memories", value: String(items.length) + (hasMore ? "+" : "") },
              { label: "This batch", value: `${rest.length} new` },
              { label: "Gang", value: "all here" },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl border border-[#e8e1d5] bg-white px-4 py-3.5">
                <p className="font-[family-name:var(--font-display)] text-xl">{s.value}</p>
                <p className="text-xs text-[#a8a29e]">{s.label}</p>
              </div>
            ))}
          </section>

          {/* Recent grid */}
          <section>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-[family-name:var(--font-display)] text-[22px] font-medium tracking-tight">
                Recent drops
              </h2>
              <Link href="/gallery" className="text-sm font-semibold text-[#57534e] hover:text-[#1c1917]">
                View all →
              </Link>
            </div>
            <div className="masonry">
              {rest.map((m) => (
                <MediaTile key={m.id} memory={m} />
              ))}
            </div>
            <div ref={sentinel} className="py-8 text-center text-sm text-[#a8a29e]">
              {loadingMore ? (
                <span className="inline-flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#e8e1d5] border-t-[#1c1917]" />
                  Loading more…
                </span>
              ) : hasMore ? (
                "Scroll for more"
              ) : items.length > 0 ? (
                "That’s everything — for now."
              ) : null}
            </div>
          </section>
        </>
      )}
    </div>
  );
}
