"use client";

import { memo, useState } from "react";
import Image from "next/image";
import { useMediaUrl } from "@/hooks/useMediaUrl";
import { cn } from "@/lib/media";

// Tiny inline placeholder so tiles never flash empty while loading.
const BLUR =
  "data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIxNiIgaGVpZ2h0PSIxNiI+PHJlY3Qgd2lkdGg9IjE2IiBoZWlnaHQ9IjE2IiBmaWxsPSIjZWNlNmQ5Ii8+PC9zdmc+";

/**
 * Lazy image with blur-up + fade. Uses Next optimization
 * so large albums don't download full-res files in grids.
 * Legacy signed URLs are transparently upgraded to token URLs.
 */
export const SmartImage = memo(function SmartImage({
  src,
  alt,
  className,
  sizes = "(max-width: 768px) 50vw, (max-width: 1280px) 33vw, 25vw",
  eager = false,
  aspect,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes?: string;
  eager?: boolean;
  aspect?: string;
}) {
  const [loaded, setLoaded] = useState(false);
  // If Next's optimizer can't fetch the file (e.g. flaky upstream),
  // fall back to the direct URL so the photo still shows.
  const [direct, setDirect] = useState(false);
  const resolved = useMediaUrl(src);
  if (!resolved) return <div className={cn("skeleton h-full w-full", className)} />;

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden bg-[#ece6d9]", className)}
      style={aspect ? { aspectRatio: aspect } : undefined}
    >
      {!loaded && <div className="skeleton absolute inset-0" />}
      {direct ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={resolved}
          alt={alt}
          loading={eager ? "eager" : "lazy"}
          onLoad={() => setLoaded(true)}
          className={cn("img-fade h-full w-full object-cover", loaded && "is-loaded")}
        />
      ) : (
        <Image
          src={resolved}
          alt={alt}
          fill
          sizes={sizes}
          loading={eager ? "eager" : "lazy"}
          priority={eager}
          fetchPriority={eager ? "high" : "auto"}
          quality={70}
          placeholder="blur"
          blurDataURL={BLUR}
          onLoad={() => setLoaded(true)}
          onError={() => setDirect(true)}
          className={cn("img-fade object-cover", loaded && "is-loaded")}
        />
      )}
    </div>
  );
});
