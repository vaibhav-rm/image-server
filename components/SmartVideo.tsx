"use client";

import { memo, useEffect, useRef, useState } from "react";
import { useMediaUrl } from "@/hooks/useMediaUrl";
import { cn } from "@/lib/media";

/**
 * Grid-friendly video: never preloads until visible, never autoplays
 * in grids, pauses when scrolled away. Tap to play inline.
 * Legacy signed URLs are transparently upgraded to token URLs.
 */
export const SmartVideo = memo(function SmartVideo({
  src,
  className,
  eager = false,
}: {
  src: string;
  className?: string;
  eager?: boolean;
}) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [visible, setVisible] = useState(eager);
  const [playing, setPlaying] = useState(false);
  const resolved = useMediaUrl(src);

  useEffect(() => {
    if (eager) return;
    const el = wrapRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        const inView = entries[0].isIntersecting;
        setVisible((v) => v || inView);
        if (!inView && videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
          setPlaying(false);
        }
      },
      { rootMargin: "400px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [eager]);

  return (
    <div ref={wrapRef} className={cn("relative h-full w-full bg-[#1c1917]", className)}>
      {visible && resolved ? (
        <video
          ref={videoRef}
          src={resolved}
          className="h-full w-full object-cover"
          playsInline
          muted
          loop
          preload="metadata"
          onClick={(e) => {
            const v = e.currentTarget;
            if (v.paused) {
              v.play().catch(() => {});
              setPlaying(true);
            } else {
              v.pause();
              setPlaying(false);
            }
          }}
        />
      ) : (
        <div className="skeleton h-full w-full" />
      )}
      {!playing && visible && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-white/90 shadow-lg">
            <span className="ml-0.5 inline-block h-0 w-0 border-y-[7px] border-l-[11px] border-y-transparent border-l-[#1c1917]" />
          </span>
        </div>
      )}
      <span className="pointer-events-none absolute bottom-2 right-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
        Video
      </span>
    </div>
  );
});
