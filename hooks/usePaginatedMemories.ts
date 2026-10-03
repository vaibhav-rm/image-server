"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  collection,
  query,
  orderBy,
  limit,
  startAfter,
  getDocs,
  QueryDocumentSnapshot,
  DocumentData,
} from "firebase/firestore";
import { db } from "@/firebase/config";
import { toMemoryDoc, type MemoryDoc } from "@/lib/media";

const PAGE_SIZE = 24;

/**
 * Paginated memories loader. Fetches 24 docs at a time with a cursor,
 * so the app stays smooth with thousands of photos/videos.
 */
export function usePaginatedMemories(pageSize = PAGE_SIZE) {
  const [items, setItems] = useState<MemoryDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const cursor = useRef<QueryDocumentSnapshot<DocumentData> | null>(null);
  const done = useRef(false);

  const loadFirst = useCallback(async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "memories"),
        orderBy("createdAt", "desc"),
        limit(pageSize)
      );
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => toMemoryDoc(d.id, d.data()));
      setItems(docs);
      cursor.current = snap.docs[snap.docs.length - 1] ?? null;
      done.current = snap.docs.length < pageSize;
      setHasMore(!done.current);
    } catch (e) {
      console.error("Failed to load memories", e);
    } finally {
      setLoading(false);
    }
  }, [pageSize]);

  const loadMore = useCallback(async () => {
    if (done.current || loadingMore || loading) return;
    if (!cursor.current) return;
    setLoadingMore(true);
    try {
      const q = query(
        collection(db, "memories"),
        orderBy("createdAt", "desc"),
        startAfter(cursor.current),
        limit(pageSize)
      );
      const snap = await getDocs(q);
      if (snap.docs.length === 0) {
        done.current = true;
        setHasMore(false);
      } else {
        const docs = snap.docs.map((d) => toMemoryDoc(d.id, d.data()));
        setItems((prev) => [...prev, ...docs]);
        cursor.current = snap.docs[snap.docs.length - 1];
        if (snap.docs.length < pageSize) {
          done.current = true;
          setHasMore(false);
        }
      }
    } catch (e) {
      console.error("Failed to load more", e);
    } finally {
      setLoadingMore(false);
    }
  }, [loading, loadingMore, pageSize]);

  useEffect(() => {
    loadFirst();
  }, [loadFirst]);

  return { items, loading, loadingMore, hasMore, loadMore, refresh: loadFirst };
}

/** Infinite-scroll sentinel: calls onVisible when scrolled into view. */
export function useInfiniteSentinel(onVisible: () => void, enabled: boolean) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onVisible();
      },
      { rootMargin: "900px 0px" }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [onVisible, enabled]);

  return ref;
}
