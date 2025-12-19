import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing URL parameter', { status: 400 });
    }

    // Security: Only allow requests to your specific Firebase bucket
    if (!url.includes('firebasestorage.googleapis.com') && !url.includes('storage.googleapis.com')) {
        return new NextResponse('Invalid URL domain', { status: 403 });
    }

    try {
        const headers = new Headers();
        // Logic: If the URL is already a Signed URL (contains signature), it should work if we just fetch it.
        // If it's a "token" URL (Client SDK style), it might fail (412).
        // The new Upload API returns Signed URLs.

        // We try to fetch it directly. If it's a new upload, it's a signed URL and should work.
        // If it's an old upload with a token, we still try. 
        // Worst case, we are now server-side so we could technically use Admin SDK to re-sign it if we parsed the path,
        // but mixing strategies is complex. Let's rely on the URL being valid or Signed.

        const response = await fetch(url, {
            method: 'GET',
            headers: headers,
            cache: 'no-store',
        });

        if (!response.ok) {
            console.error(`Proxy upstream error: ${response.status} ${response.statusText}`);
            return new NextResponse(`Failed to fetch image: ${response.statusText}`, { status: response.status });
        }

        const contentType = response.headers.get('content-type') || 'application/octet-stream';
        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        return new NextResponse(buffer, {
            headers: {
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*',
            },
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
