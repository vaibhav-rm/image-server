export type MediaKind = "image" | "video";

export interface MediaItem {
  url: string;
  type: MediaKind;
  path?: string;
  /** Lightweight thumbnail for videos (captured at upload). */
  poster?: string;
  posterPath?: string;
}

export interface MemoryDoc {
  id: string;
  eventName?: string;
  caption?: string;
  tags?: string[];
  people?: string[];
  userEmail?: string;
  createdAt?: { toDate: () => Date };
  sortDate: Date;
  media: MediaItem[];
  // legacy fields
  mediaUrl?: string;
  mediaType?: string;
}

/** Normalize old + new schemas into a clean media list. */
export function getMediaList(doc: Record<string, unknown>): MediaItem[] {
  const raw = doc as {
    media?: Array<{ url?: string; type?: string }>;
    mediaUrl?: string;
    mediaType?: string;
  };
  if (Array.isArray(raw.media) && raw.media.length > 0) {
    return raw.media
      .filter((m) => m?.url)
      .map((m) => ({
        url: m.url as string,
        type: m.type === "video" ? "video" : "image",
        path: (m as { path?: string }).path,
        poster: (m as { poster?: string }).poster,
        posterPath: (m as { posterPath?: string }).posterPath,
      }));
  }
  if (raw.mediaUrl) {
    return [
      {
        url: raw.mediaUrl,
        type: raw.mediaType === "video" ? "video" : "image",
      },
    ];
  }
  return [];
}

export function toMemoryDoc(id: string, data: Record<string, unknown>): MemoryDoc {
  const created = (data.createdAt as { toDate?: () => Date } | undefined)?.toDate?.();
  return {
    id,
    ...(data as Omit<MemoryDoc, "id" | "sortDate" | "media">),
    media: getMediaList(data),
    sortDate: created ?? new Date(),
  };
}

export function timeAgo(date: Date): string {
  const s = Math.floor((Date.now() - date.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric", year: date.getFullYear() !== new Date().getFullYear() ? "numeric" : undefined });
}

export function formatLong(date: Date): string {
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function monthKey(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "long", year: "numeric" });
}

export function greeting(): string {
  const h = new Date().getHours();
  if (h < 5) return "Up late?";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}
