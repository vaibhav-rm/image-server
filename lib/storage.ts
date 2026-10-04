import "server-only";
import { randomUUID } from "crypto";
import { adminStorage } from "./firebase-admin";
import { isGenericMime, mimeForFilename } from "./mime";

/** Upload/session paths the app is allowed to write. */
export function isAllowedPath(path: unknown): path is string {
  return (
    typeof path === "string" &&
    /^(memories|avatars|posters)\//.test(path) &&
    !path.includes("..") &&
    path.length < 500
  );
}

function parseStoredUrl(u: string): { bucket: string; path: string } | null {
  try {
    const url = new URL(u);
    const m = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
    if (m) return { bucket: m[1], path: decodeURIComponent(m[2]) };
    if (
      url.hostname === "storage.googleapis.com" ||
      url.hostname.endsWith(".storage.googleapis.com")
    ) {
      const parts = url.pathname.replace(/^\/+/, "").split("/");
      const bucket = parts.shift();
      if (bucket && parts.length > 0) {
        return { bucket, path: decodeURIComponent(parts.join("/")) };
      }
    }
    return null;
  } catch {
    return null;
  }
}

export function isTokenUrl(u?: string): boolean {
  if (!u) return false;
  return (
    u.includes("firebasestorage.googleapis.com") &&
    u.includes("alt=media") &&
    u.includes("token=")
  );
}

function tokenUrl(bucket: string, path: string, token: string): string {
  return (
    `https://firebasestorage.googleapis.com/v0/b/${bucket}` +
    `/o/${encodeURIComponent(path)}?alt=media&token=${token}`
  );
}

export interface EnsuredMedia {
  url: string;
  tokenCreated: boolean;
  mimeRepaired: boolean;
}

/**
 * Ensures a stored object has a download token + a correct content type,
 * and returns its short public token URL. Throws if the object is missing.
 */
export async function ensurePublicMedia(
  bucketName: string,
  path: string,
  contentTypeHint?: string
): Promise<EnsuredMedia> {
  const bucket = adminStorage.bucket(bucketName);
  const file = bucket.file(path);
  const [meta] = await file.getMetadata();

  const existing = (meta.metadata as Record<string, string> | undefined)
    ?.firebaseStorageDownloadTokens?.split(",")[0];

  let token = existing;
  let tokenCreated = false;
  const patch: { metadata?: Record<string, string>; contentType?: string } = {};

  if (!token) {
    token = randomUUID();
    patch.metadata = { firebaseStorageDownloadTokens: token };
    tokenCreated = true;
  }

  const implied = mimeForFilename(path) || contentTypeHint;
  let mimeRepaired = false;
  if (implied && isGenericMime(meta.contentType)) {
    patch.contentType = implied;
    mimeRepaired = true;
  }

  if (patch.metadata || patch.contentType) {
    await file.setMetadata(patch);
  }

  return { url: tokenUrl(bucketName, path, token!), tokenCreated, mimeRepaired };
}

/** Upgrade any stored media URL to a token URL. Returns upgraded=false on failure. */
export async function resolveStoredUrl(
  stored: string
): Promise<{ url: string; upgraded: boolean }> {
  if (isTokenUrl(stored)) return { url: stored, upgraded: true };
  const parsed = parseStoredUrl(stored);
  if (!parsed) return { url: stored, upgraded: false };
  try {
    const { url } = await ensurePublicMedia(parsed.bucket, parsed.path);
    return { url, upgraded: true };
  } catch (error: any) {
    console.error("Media resolve error:", error?.message);
    return { url: stored, upgraded: false };
  }
}

let corsEnsured = false;

/**
 * Browsers PUT bytes straight to GCS, which requires the bucket to
 * allow cross-origin PUTs. Ensures a permissive CORS config once per
 * server instance (idempotent; warns instead of failing).
 */
export async function ensureBucketCors(): Promise<void> {
  if (corsEnsured) return;
  try {
    await adminStorage.bucket().setCorsConfiguration([
      {
        maxAgeSeconds: 3600,
        method: ["GET", "PUT", "POST", "DELETE", "HEAD", "OPTIONS"],
        origin: ["*"],
        responseHeader: ["Content-Type", "Content-Length", "ETag"],
      },
    ]);
    corsEnsured = true;
  } catch (error: any) {
    console.warn("Could not set bucket CORS (uploads may fail):", error?.message);
  }
}
