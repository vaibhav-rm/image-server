import { NextRequest, NextResponse } from 'next/server';

/**
 * Fallback proxy for old Firebase token URLs with CORS trouble.
 * New code loads signed URLs directly (much faster). This route
 * streams instead of buffering, so it won't OOM on large files.
 */
export async function GET(request: NextRequest) {
    const url = request.nextUrl.searchParams.get('url');

    if (!url) {
        return new NextResponse('Missing URL parameter', { status: 400 });
    }

    if (!url.includes('firebasestorage.googleapis.com') && !url.includes('storage.googleapis.com')) {
        return new NextResponse('Invalid URL domain', { status: 403 });
    }

    try {
        const upstream = await fetch(url, { cache: 'force-cache' });

        if (!upstream.ok || !upstream.body) {
            return new NextResponse(`Failed to fetch image: ${upstream.statusText}`, {
                status: upstream.status,
            });
        }

        const contentType = upstream.headers.get('content-type') || 'application/octet-stream';

        return new NextResponse(upstream.body, {
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
