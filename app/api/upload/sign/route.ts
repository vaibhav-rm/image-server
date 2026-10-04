import { NextRequest, NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase-admin";
import { ensureBucketCors, isAllowedPath } from "@/lib/storage";
import { sniffMime } from "@/lib/mime";

/**
 * Step 1 of direct-to-GCS upload: mint a short-lived signed PUT URL so
 * the browser can send bytes straight to Cloud Storage (no server
 * buffering, no function body limits, resumable-friendly).
 * Body: { path, contentType?, filename? }
 */
export async function POST(request: NextRequest) {
    let body: { path?: unknown; contentType?: unknown; filename?: unknown };
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { path, contentType, filename } = body;
    if (!isAllowedPath(path)) {
        return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    const type =
        typeof contentType === "string" && contentType
            ? contentType
            : sniffMime(undefined, typeof filename === "string" ? filename : path);

    try {
        await ensureBucketCors();
        const [signedUrl] = await adminStorage
            .bucket()
            .file(path)
            .getSignedUrl({
                version: "v4",
                action: "write",
                expires: Date.now() + 15 * 60 * 1000,
                contentType: type,
            });

        return NextResponse.json({ signedUrl, path, contentType: type });
    } catch (error: any) {
        console.error("Sign upload error:", error?.message);
        return NextResponse.json({ error: error?.message || "Sign failed" }, { status: 500 });
    }
}
