// Direct URLs are faster than proxying through the server.
// Signed Firebase URLs work fine in the browser, and Next <Image>
// can optimize them directly. The /api/image-proxy route is kept
// only as a fallback for old token URLs that hit CORS issues.

export const getProxyUrl = (url?: string) => {
  if (!url) return "";
  return url;
};
