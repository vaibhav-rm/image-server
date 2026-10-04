import { NextRequest, NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase-admin";
import { ensurePublicMedia, isAllowedPath } from "@/lib/storage";
import { extOf } from "@/lib/mime";

/**
 * Step 3 of direct-to-GCS upload: after the browser PUTs bytes to the
 * signed URL, ensure a download token + correct content type and hand
 * back the short public URL + storage path.
 * Body: { path, contentType? }
 */
export async function POST(request: NextRequest) {
    let body: { path?: unknown; contentType?: unknown };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { path, contentType } = body;
    if (!isAllowedPath(path)) {
        return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    try {
        const bucket = adminStorage.bucket().name;
        const { url } = await ensurePublicMedia(
            bucket,
            path,
            typeof contentType === "string" ? contentType : undefined
        );
        const ext = extOf(path);
        const imageExts = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif", "heic", "heif"]);
        return NextResponse.json({
            url,
            path,
            type: imageExts.has(ext)
                ? "image"
                : typeof contentType === "string" && contentType.startsWith("image")
                  ? "image"
                  : "video",
        });
    } catch (error: any) {
        console.error("Finalize upload error:", error?.message);
        return NextResponse.json(
            { error: "Upload incomplete — file not found in storage. Please retry." },
            { status: 400 }
        );
    }
}
