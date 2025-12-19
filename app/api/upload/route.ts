import { NextRequest, NextResponse } from "next/server";
import { adminStorage } from "@/lib/firebase-admin";

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

        await fileRef.save(buffer, {
            metadata: {
                contentType: file.type,
            },
        });

        // Make the file public (optional, helps with simple reads if rules allow, but we rely on Admin SDK)
        // await fileRef.makePublic(); 

        // Get the public URL (or signed URL if strictly private)
        // For now we construct the public URL manually which works if the bucket allows read or we proxy it
        // But since the public access layer is broken (service agent missing), we need the signed URL or we proxy via server.

        // Strategy: We return a token-based URL like Client SDK does? No, Admin SDK doesn't generate "download tokens" easily.
        // Instead, we will return the GS path or a long-lived Signed URL.
        // Since our Proxy can read ANY url from firebasestorage domain, we can actually use a Signed URL here.

        const [signedUrl] = await fileRef.getSignedUrl({
            action: 'read',
            expires: '03-01-2500', // Long expiry
        });

        return NextResponse.json({ url: signedUrl, type: file.type.startsWith("image") ? "image" : "video" });
    } catch (error: any) {
        console.error("Upload error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
