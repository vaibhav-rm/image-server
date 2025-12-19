export const getProxyUrl = (url?: string) => {
    if (!url) return '';
    if (!url.includes('firebasestorage.googleapis.com')) return url;
    return `/api/image-proxy?url=${encodeURIComponent(url)}`;
};
