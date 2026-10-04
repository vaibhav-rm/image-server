import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { adminStorage } from "@/lib/firebase-admin";
import { sniffMime } from "@/lib/mime";

/**
 * Uploads a file with the Admin SDK and returns a short, stable
 * Firebase download-token URL:
 *   https://firebasestorage.googleapis.com/v0/b/<bucket>/o/<path>?alt=media&token=<uuid>
 *
 * Token URLs (unlike long V4/V2 signed URLs) survive Next's image
 * optimizer, browser caches, and cross-origin <video> playback —
 * they are the same kind of URL the Firebase client SDK produces.
 */
export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get("file") as File;
        const path = formData.get("path") as string;

        if (!file || !path) {
            return NextResponse.json({ error: "Missing file or path" }, { status: 400 });
        }

        const buffer = Buffer.from(await file.arrayBuffer());
        const bucket = adminStorage.bucket();
        const fileRef = bucket.file(path);
        const token = randomUUID();
        // Phones often send empty/generic types — infer from the
        // filename so browsers get a playable content type.
        const contentType = sniffMime(file.type, file.name);

        await fileRef.save(buffer, {
            metadata: {
                contentType,
                metadata: {
                    firebaseStorageDownloadTokens: token,
                },
            },
        });

        const url = `https://firebasestorage.googleapis.com/v0/b/${bucket.name}/o/${encodeURIComponent(path)}?alt=media&token=${token}`;

        return NextResponse.json({
            url,
            path,
            type: contentType.startsWith("image") ? "image" : "video",
        });
    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
