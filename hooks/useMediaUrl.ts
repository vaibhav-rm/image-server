"use client";

import { useEffect, useState } from "react";

const memCache = new Map<string, string>();
const LS_KEY = "dih-media-urls-v1";

function readLS(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || "{}");
  } catch {
    return {};
  }
}

function writeLS(map: Record<string, string>) {
  try {
    const keys = Object.keys(map).slice(-500);
    const trimmed: Record<string, string> = {};
    for (const k of keys) trimmed[k] = map[k];
    localStorage.setItem(LS_KEY, JSON.stringify(trimmed));
  } catch {
    /* storage full or unavailable — memory cache still works */
  }
}

// Hydrate memory cache from localStorage on first use (client only).
let hydrated = false;
function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  const saved = readLS();
  for (const [k, v] of Object.entries(saved)) memCache.set(k, v);
}

export function isTokenUrl(u?: string): boolean {
  if (!u) return false;
  return (
    u.includes("firebasestorage.googleapis.com") &&
    u.includes("alt=media") &&
    u.includes("token=")
  );
}

/**
 * Returns a playable URL for a stored media URL.
 * - Token URLs (all new uploads) pass through with zero network cost.
 * - Legacy signed URLs are upgraded via /api/media/resolve once,
 *   then cached in memory + localStorage.
 * Falls back to the original URL on any failure.
 */
export function useMediaUrl(stored?: string): string {
  hydrate();
  const [url, setUrl] = useState(() => {
    if (!stored) return "";
    return memCache.get(stored) ?? stored;
  });

  useEffect(() => {
    if (!stored) {
      setUrl("");
      return;
    }
    const cached = memCache.get(stored);
    if (cached) {
      setUrl(cached);
      return;
    }
    if (isTokenUrl(stored)) {
      setUrl(stored);
      return;
    }
    let alive = true;
    fetch(`/api/media/resolve?u=${encodeURIComponent(stored)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!alive) return;
        const resolved = d?.url;
        if (resolved && typeof resolved === "string") {
          memCache.set(stored, resolved);
          writeLS({ ...readLS(), [stored]: resolved });
          setUrl(resolved);
        }
      })
      .catch(() => {
        /* fall back to original URL */
      });
    return () => {
      alive = false;
    };
  }, [stored]);

  return url;
}
