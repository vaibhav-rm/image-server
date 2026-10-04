import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { adminStorage } from "@/lib/firebase-admin";
import { isGenericMime, mimeForFilename } from "@/lib/mime";

/**
 * Resolves any stored media URL to a short, stable Firebase
 * download-token URL.
 *
 * - Already a token URL (?alt=media&token=…) → returned as-is.
 * - Old long signed URLs (storage.googleapis.com/<bucket>/<path>?…)
 *   → bucket + path are parsed out, a download token is ensured on
 *   the file (created if missing), and the clean token URL is returned.
 *
 * Clients cache the result, so this runs at most once per legacy file.
 */
function parseStoredUrl(u: string): { bucket: string; path: string } | null {
    try {
        const url = new URL(u);

        // Firebase API style: /v0/b/<bucket>/o/<url-encoded path>
        const m = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
        if (m) return { bucket: m[1], path: decodeURIComponent(m[2]) };

        // Path style (old signed URLs): storage.googleapis.com/<bucket>/<path>
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

function isTokenUrl(u: string): boolean {
    return (
        u.includes("firebasestorage.googleapis.com") &&
        u.includes("alt=media") &&
        u.includes("token=")
    );
}

export async function GET(request: NextRequest) {
    const stored = request.nextUrl.searchParams.get("u");
    if (!stored) {
        return NextResponse.json({ error: "Missing u parameter" }, { status: 400 });
    }

    if (isTokenUrl(stored)) {
        return NextResponse.json(
            { url: stored, upgraded: true },
            { headers: { "Cache-Control": "public, max-age=31536000, immutable" } }
        );
    }

    const parsed = parseStoredUrl(stored);
    if (!parsed) {
        // Unknown shape — let the client try the original URL.
        return NextResponse.json({ url: stored, upgraded: false });
    }

    try {
        const bucket = adminStorage.bucket(parsed.bucket);
        const file = bucket.file(parsed.path);

        const [meta] = await file.getMetadata();
        const existing = (meta.metadata as Record<string, string> | undefined)
            ?.firebaseStorageDownloadTokens?.split(",")[0];

        let token = existing;
        const patch: { metadata?: Record<string, string>; contentType?: string } = {};

        if (!token) {
            token = randomUUID();
            patch.metadata = { firebaseStorageDownloadTokens: token };
        }

        // Repair wrong content types (e.g. application/octet-stream on a
        // .mp4): browsers — Firefox especially — refuse to play those.
        // Only overwrites generic/unknown types, never a specific one.
        const implied = mimeForFilename(parsed.path);
        if (implied && isGenericMime(meta.contentType)) {
            patch.contentType = implied;
        }

        if (patch.metadata || patch.contentType) {
            await file.setMetadata(patch);
        }

        const url =
            `https://firebasestorage.googleapis.com/v0/b/${parsed.bucket}` +
            `/o/${encodeURIComponent(parsed.path)}?alt=media&token=${token}`;

        return NextResponse.json(
            { url, upgraded: true },
            { headers: { "Cache-Control": "public, max-age=86400" } }
        );
    } catch (error: any) {
        console.error("Media resolve error:", error?.message);
        // Fall back to the original URL rather than breaking the tile.
        return NextResponse.json({ url: stored, upgraded: false });
    }
}
