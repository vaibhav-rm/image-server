import { NextRequest, NextResponse } from "next/server";
import { resolveStoredUrl } from "@/lib/storage";

/**
 * Resolves any stored media URL to a short, stable Firebase
 * download-token URL.
 *
 * - Already a token URL (?alt=media&token=…) → returned as-is.
 * - Old long signed URLs → bucket + path are parsed out, a download
 *   token is ensured on the file (created if missing), a wrong content
 *   type is repaired, and the clean token URL is returned.
 *
 * Clients cache successful upgrades, so this runs at most once per file.
 * { url, upgraded } — upgraded=false means "try the original, retry later".
 */
export async function GET(request: NextRequest) {
    const stored = request.nextUrl.searchParams.get("u");
    if (!stored) {
        return NextResponse.json({ error: "Missing u parameter" }, { status: 400 });
    }

    const result = await resolveStoredUrl(stored);
    return NextResponse.json(result, {
        headers: {
            "Cache-Control": result.upgraded
                ? "public, max-age=86400"
                : "public, max-age=60",
        },
    });
}
