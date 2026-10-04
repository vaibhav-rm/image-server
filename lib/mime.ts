/** Shared filename ↔ MIME helpers (usable on client and server). */

export const EXT_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
  heic: "image/heic",
  heif: "image/heif",
  mp4: "video/mp4",
  m4v: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  ogv: "video/ogg",
  ogg: "video/ogg",
  mkv: "video/x-matroska",
  avi: "video/x-msvideo",
};

export function extOf(name?: string): string {
  if (!name) return "";
  const m = name.split("?")[0].split("#")[0].match(/\.([a-z0-9]+)$/i);
  return (m?.[1] || "").toLowerCase();
}

export function mimeForFilename(name?: string): string | undefined {
  const ext = extOf(name);
  return ext ? EXT_MIME[ext] : undefined;
}

/** Content types that mean "unknown" and are safe to overwrite. */
export function isGenericMime(mime?: string | null): boolean {
  if (!mime) return true;
  const m = mime.toLowerCase().split(";")[0].trim();
  return (
    m === "" ||
    m === "application/octet-stream" ||
    m === "application/binary" ||
    m === "binary/octet-stream"
  );
}

/** Best-effort content type: browser-provided, else inferred from name. */
export function sniffMime(browserType: string | undefined, filename: string): string {
  if (browserType && !isGenericMime(browserType)) return browserType;
  return mimeForFilename(filename) || browserType || "application/octet-stream";
}
