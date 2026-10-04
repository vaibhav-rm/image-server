import { sniffMime } from "./mime";

export interface UploadedMedia {
  url: string;
  path: string;
  type: string;
}

/**
 * Uploads bytes straight to Cloud Storage (signed PUT), then finalizes
 * to a public token URL. Nothing large ever passes through the Next
 * server, so there are no function body limits and no server OOMs.
 */
export async function uploadBytes(
  file: File,
  path: string,
  onProgress?: (pct: number) => void
): Promise<UploadedMedia> {
  const contentType = sniffMime(file.type || undefined, file.name);

  // 1. Mint a short-lived signed PUT URL.
  const signRes = await fetch("/api/upload/sign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, contentType, filename: file.name }),
  });
  if (!signRes.ok) {
    const data = await signRes.json().catch(() => null);
    throw new Error(data?.error || `Couldn't start upload (${signRes.status})`);
  }
  const { signedUrl } = (await signRes.json()) as { signedUrl: string };

  // 2. PUT bytes direct to GCS with real progress (fetch has no upload events).
  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("Content-Type", contentType);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
      } else {
        reject(new Error(`Upload interrupted (${xhr.status}) — tap retry`));
      }
    };
    xhr.onerror = () => reject(new Error("Network dropped during upload — tap retry"));
    xhr.ontimeout = () => reject(new Error("Upload timed out — tap retry"));
    xhr.timeout = 10 * 60 * 1000;
    xhr.send(file);
  });

  // 3. Finalize: token URL + repaired content type.
  const finRes = await fetch("/api/upload/finalize", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path, contentType }),
  });
  if (!finRes.ok) {
    const data = await finRes.json().catch(() => null);
    throw new Error(data?.error || `Couldn't finish upload (${finRes.status})`);
  }
  return (await finRes.json()) as UploadedMedia;
}

/** Retry helper for flaky phone networks (waits a beat between tries). */
export async function uploadWithRetry(
  file: File,
  path: string,
  onProgress?: (pct: number) => void,
  tries = 3
): Promise<UploadedMedia> {
  let last: unknown = null;
  for (let attempt = 1; attempt <= tries; attempt++) {
    try {
      return await uploadBytes(file, path, onProgress);
    } catch (e) {
      last = e;
      if (attempt < tries) await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  throw last instanceof Error ? last : new Error("Upload failed");
}
