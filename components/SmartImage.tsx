"use client";

import { memo, useState } from "react";
import Image from "next/image";
import { useMediaUrl } from "@/hooks/useMediaUrl";
import { cn } from "@/lib/media";

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
  const resolved = useMediaUrl(src);
  if (!resolved) return <div className={cn("skeleton h-full w-full", className)} />;

  return (
    <div
      className={cn("relative h-full w-full overflow-hidden bg-[#ece6d9]", className)}
      style={aspect ? { aspectRatio: aspect } : undefined}
    >
      {!loaded && <div className="skeleton absolute inset-0" />}
      <Image
        src={resolved}
        alt={alt}
        fill
        sizes={sizes}
        loading={eager ? "eager" : "lazy"}
        priority={eager}
        quality={70}
        onLoad={() => setLoaded(true)}
        className={cn("img-fade object-cover", loaded && "is-loaded")}
      />
    </div>
  );
});
