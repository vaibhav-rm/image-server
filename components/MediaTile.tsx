"use client";

import { memo } from "react";
import { useRouter } from "next/navigation";
import { SmartImage } from "./SmartImage";
import { SmartVideo } from "./SmartVideo";
import { timeAgo, type MemoryDoc } from "@/lib/media";

/** One masonry tile. Memoized so scrolling 1000s of items stays cheap. */
export const MediaTile = memo(function MediaTile({
  memory,
  eager = false,
}: {
  memory: MemoryDoc;
  eager?: boolean;
}) {
  const router = useRouter();
  const first = memory.media[0];
  if (!first) return null;

  // Vary tile height for an organic album feel (deterministic, no layout thrash)
  const hash = memory.id.charCodeAt(0) + memory.id.length;
  const tall = hash % 3 === 0;

  return (
    <article
      onClick={() => router.push(`/memory/${memory.id}`)}
      className="cv-auto card-hover group cursor-pointer overflow-hidden rounded-2xl border border-[#e8e1d5] bg-white"
    >
      <div className={tall ? "aspect-[3/4]" : "aspect-[4/3]"}>
        {first.type === "video" ? (
          <SmartVideo src={first.url} eager={eager} />
        ) : (
          <SmartImage
            src={first.url}
            alt={memory.caption || memory.eventName || "Memory"}
            eager={eager}
          />
        )}
      </div>
      <div className="px-3.5 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <h3 className="truncate text-[14px] font-semibold text-[#1c1917]">
            {memory.eventName || memory.caption?.slice(0, 40) || "Untitled"}
          </h3>
          <span className="shrink-0 text-[11px] text-[#a8a29e]">{timeAgo(memory.sortDate)}</span>
        </div>
        {memory.caption && memory.eventName && (
          <p className="mt-0.5 line-clamp-1 text-[13px] text-[#78716c]">{memory.caption}</p>
        )}
        {memory.media.length > 1 && (
          <p className="mt-1 text-[11px] font-medium text-[#78716c]">
            +{memory.media.length - 1} more
          </p>
        )}
      </div>
    </article>
  );
});
