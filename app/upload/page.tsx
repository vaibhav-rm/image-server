"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { collection, addDoc, serverTimestamp, query, orderBy, getDocs, limit } from "firebase/firestore";
import { db } from "@/firebase/config";
import { Avatar } from "@/components/ui";
import { extOf } from "@/lib/mime";
import { uploadWithRetry } from "@/lib/upload";

const VIDEO_EXTS = new Set(["mp4", "m4v", "mov", "webm", "ogv", "ogg", "mkv", "avi", "3gp", "3g2"]);
const IMAGE_EXTS = new Set(["jpg", "jpeg", "png", "webp", "gif", "avif", "heic", "heif"]);

function kindOf(file: File): "image" | "video" | null {
  if (file.type.startsWith("image/")) return "image";
  if (file.type.startsWith("video/")) return "video";
  // Some phones/browsers send an empty MIME type — fall back to extension.
  const ext = extOf(file.name);
  if (IMAGE_EXTS.has(ext)) return "image";
  if (VIDEO_EXTS.has(ext)) return "video";
  return null;
}

function isHeic(file: File): boolean {
  return (
    file.type === "image/heic" ||
    file.type === "image/heif" ||
    extOf(file.name) === "heic" ||
    extOf(file.name) === "heif"
  );
}

/** iPhone photos arrive as HEIC, which Chrome/Firefox can't display.
 *  Convert to JPEG (loaded on demand so it never touches first paint). */
async function convertHeic(file: File): Promise<File> {
  const { default: heic2any } = await import("heic2any");
  const out = await heic2any({ blob: file, toType: "image/jpeg", quality: 0.85 });
  const blob = Array.isArray(out) ? out[0] : out;
  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

/** Grab a small JPEG poster from a video file (first real frame). */
async function capturePoster(file: File): Promise<File | null> {
  const url = URL.createObjectURL(file);
  const video = document.createElement("video");
  try {
    video.muted = true;
    (video as any).playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("poster timeout")), 9000);
      video.onloadeddata = () => {
        clearTimeout(timer);
        resolve();
      };
      video.onerror = () => {
        clearTimeout(timer);
        reject(new Error("poster decode failed"));
      };
    });
    try {
      await new Promise<void>((resolve) => {
        const done = () => resolve();
        video.onseeked = (done as unknown) as () => void;
        video.currentTime = Math.min(0.6, (video.duration || 1.2) / 2);
        setTimeout(done, 2500);
      });
    } catch {
      /* use first frame */
    }
    if (!video.videoWidth) return null;
    const maxW = 640;
    const scale = Math.min(1, maxW / video.videoWidth);
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob(res, "image/jpeg", 0.7)
    );
    if (!blob) return null;
    return new File([blob], "poster.jpg", { type: "image/jpeg" });
  } catch {
    return null;
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Downscale images client-side so albums stay fast + storage stays small. */
async function compressImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  // Skip tiny files / gifs
  if (file.size < 600 * 1024 || file.type.includes("gif")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const max = 1920;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    if (scale === 1) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob(res, "image/jpeg", 0.82)
    );
    if (!blob) return file;
    return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
  } catch {
    return file;
  }
}

interface Pick {
  file: File;
  preview: string;
  kind: "image" | "video";
  progress: number;
  done: boolean;
  error?: string;
}

export default function UploadPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [picks, setPicks] = useState<Pick[]>([]);
  const [drag, setDrag] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [converting, setConverting] = useState(false);
  const [eventName, setEventName] = useState("");
  const [caption, setCaption] = useState("");
  const [members, setMembers] = useState<Array<{ id: string; name: string; photo?: string }>>([]);
  const [selectedPeople, setSelectedPeople] = useState<string[]>([]);
  const [extraPeople, setExtraPeople] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const selfPreselected = useRef(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  // Everyone in the gang, for the "who was there" picker.
  useEffect(() => {
    if (!user) return;
    getDocs(query(collection(db, "users"), orderBy("joinedAt", "asc"), limit(100)))
      .then((snap) => {
        const list = snap.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            name:
              (data.displayName as string) ||
              (data.email as string)?.split("@")[0] ||
              "Friend",
            photo: data.photoURL as string | undefined,
          };
        });
        setMembers(list);
        // Pre-select yourself — you're obviously there.
        if (!selfPreselected.current) {
          selfPreselected.current = true;
          const me = list.find((m) => m.id === user.uid);
          if (me) setSelectedPeople([me.name]);
        }
      })
      .catch(() => {
        /* offline or denied — free-text input below still works */
      });
  }, [user]);

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => picks.forEach((p) => URL.revokeObjectURL(p.preview));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback(async (list: FileList | File[] | null) => {
    if (!list) return;
    const arr = Array.from(list).filter((f) => kindOf(f) !== null);
    if (arr.length === 0) return;

    // Convert iPhone HEIC photos up front so previews + uploads are real JPEGs.
    const needsConvert = arr.filter(isHeic);
    let converted = arr;
    if (needsConvert.length > 0) {
      setConverting(true);
      try {
        converted = await Promise.all(
          arr.map(async (f) => {
            if (!isHeic(f)) return f;
            try {
              return await convertHeic(f);
            } catch {
              return f; // keep original; Safari can still show it
            }
          })
        );
      } finally {
        setConverting(false);
      }
    }

    setPicks((prev) => [
      ...prev,
      ...converted.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        kind: kindOf(file) as "image" | "video",
        progress: 0,
        done: false,
      })),
    ]);
  }, []);

  const removeAt = (i: number) =>
    setPicks((prev) => {
      URL.revokeObjectURL(prev[i].preview);
      return prev.filter((_, x) => x !== i);
    });

  // Successful uploads, keyed by pick index — survives retries so a
  // second attempt only re-sends what actually failed.
  const resultsRef = useRef<
    Map<number, { url: string; path: string; type: string; poster?: string; posterPath?: string }>
  >(new Map());

  const setProgress = (i: number, progress: number) =>
    setPicks((prev) => prev.map((x, xi) => (xi === i ? { ...x, progress } : x)));

  const uploadOne = async (p: Pick, i: number) => {
    const file = await compressImage(p.file);
    const isVideo = p.kind === "video";
    const base = `memories/${user!.uid}/${Date.now()}_${i}_${file.name}`;

    try {
      // Videos: capture + upload a tiny poster first so grids never
      // need to download video bytes just to show a thumbnail.
      let poster: string | undefined;
      let posterPath: string | undefined;
      if (isVideo) {
        try {
          const posterFile = await capturePoster(p.file);
          if (posterFile) {
            const up = await uploadWithRetry(
              posterFile,
              `posters/${user!.uid}/${Date.now()}_${i}_poster.jpg`
            );
            poster = up.url;
            posterPath = up.path;
          }
        } catch {
          /* poster is optional — video still uploads */
        }
      }

      const data = await uploadWithRetry(file, base, (pct) => setProgress(i, pct));
      setPicks((prev) =>
        prev.map((x, xi) =>
          xi === i ? { ...x, progress: 100, done: true, error: undefined } : x
        )
      );
      const result = {
        url: data.url,
        path: data.path,
        type: isVideo ? "video" : data.type,
        ...(poster ? { poster, posterPath } : {}),
      };
      resultsRef.current.set(i, result);
      return result;
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Upload failed";
      setPicks((prev) => prev.map((x, xi) => (xi === i ? { ...x, error: msg } : x)));
      throw e;
    }
  };

  const saveMemoryDoc = async () => {
    const results = picks.map((_, i) => resultsRef.current.get(i));
    if (results.some((r) => !r) || !user) return false;
    const done = results as NonNullable<(typeof results)[number]>[];
    await addDoc(collection(db, "memories"), {
      eventName: eventName.trim() || "Untitled moment",
      media: done,
      mediaUrl: done[0].url,
      mediaType: done[0].type,
      caption: caption.trim(),
      tags: [],
      people: Array.from(
        new Set([
          ...selectedPeople,
          ...extraPeople
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        ])
      ),
      uploadedBy: user.uid,
      userEmail: user.email,
      createdAt: serverTimestamp(),
    });
    return true;
  };

  const runPending = async (indices: number[]) => {
    // 3 at a time so weak phone radios aren't choked.
    for (let s = 0; s < indices.length; s += 3) {
      const batch = indices.slice(s, s + 3);
      await Promise.allSettled(batch.map((i) => uploadOne(picks[i], i)));
    }
  };

  const failedCount = picks.filter((p) => p.error && !p.done).length;

  const handleUpload = async () => {
    if (picks.length === 0 || !user || uploading) return;
    setUploading(true);
    try {
      const pending = picks.map((_, i) => i).filter((i) => !resultsRef.current.has(i));
      await runPending(pending);
      if (await saveMemoryDoc()) {
        router.push("/gallery");
      }
      // else: failures remain — inline retry button appears, no alert popup
    } finally {
      setUploading(false);
    }
  };

  const retryFailed = async () => {
    if (!user || uploading) return;
    setUploading(true);
    try {
      const failed = picks
        .map((p, i) => ({ p, i }))
        .filter(({ p, i }) => p.error && !resultsRef.current.has(i))
        .map(({ i }) => i);
      // clear old errors before re-trying
      setPicks((prev) => prev.map((x) => ({ ...x, error: undefined })));
      await runPending(failed);
      if (await saveMemoryDoc()) {
        router.push("/gallery");
      }
    } finally {
      setUploading(false);
    }
  };

  if (loading || !user) return null;

  return (
    <div className="relative z-10 mx-auto max-w-2xl">
      <h1 className="font-[family-name:var(--font-display)] text-[32px] font-medium tracking-tight sm:text-4xl">
        Add to the album
      </h1>
      <p className="mt-1 text-[15px] text-[#78716c]">
        Drop in as many photos and videos as you want — they’ll compress and upload in the background.
      </p>

      <div className="card mt-5 p-5 sm:p-6">
        <div
          onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); addFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
          className={`cursor-pointer rounded-2xl border-2 border-dashed p-6 text-center transition-colors ${
            drag ? "border-[#b4540a] bg-[#fef0e2]" : "border-[#e8e1d5] bg-[#faf8f4] hover:border-[#1c1917]/30"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(e) => { addFiles(e.target.files); e.target.value = ""; }}
          />
          <p className="font-medium">
            {converting ? "Converting iPhone photos…" : "Drag photos here, or tap to browse"}
          </p>
          <p className="mt-1 text-sm text-[#a8a29e]">
            Photos auto-compress · iPhone HEIC becomes JPEG · videos keep a light preview
          </p>
        </div>

        {picks.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {picks.map((p, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-[#e8e1d5] bg-[#f3efe7]">
                {p.kind === "video" ? (
                  <video src={p.preview} muted playsInline preload="metadata" className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.preview} alt="" className="h-full w-full object-cover" />
                )}
                <span className="absolute bottom-1.5 left-1.5 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white">
                  {(p.file.size / 1048576).toFixed(1)} MB
                </span>
                {!p.done && p.progress > 0 && (
                  <div className="absolute inset-x-0 bottom-0 h-1 bg-black/20">
                    <div className="h-full bg-[#b4540a] transition-all" style={{ width: `${p.progress}%` }} />
                  </div>
                )}
                {p.done && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-green-700 px-2 py-0.5 text-[10px] font-semibold text-white">
                    Done
                  </span>
                )}
                {p.error && (
                  <span
                    title={p.error}
                    className="absolute inset-x-1.5 bottom-1.5 truncate rounded-lg bg-red-700/90 px-2 py-1 text-center text-[10px] font-semibold text-white"
                  >
                    {p.error}
                  </span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); removeAt(i); }}
                  className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm text-white hover:bg-black"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-1.5 block text-sm font-medium">What was this?</label>
            <input
              value={eventName}
              onChange={(e) => setEventName(e.target.value)}
              placeholder="e.g. Goa weekend, Diwali at home"
              className="w-full rounded-xl border border-[#e8e1d5] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#1c1917]/40"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">A line about it <span className="font-normal text-[#a8a29e]">(optional)</span></label>
            <textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="The story behind these…"
              rows={2}
              className="w-full resize-none rounded-xl border border-[#e8e1d5] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#1c1917]/40"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium">
              Who was there?{" "}
              {selectedPeople.length > 0 && (
                <span className="font-normal text-[#a8a29e]">
                  ({selectedPeople.length} picked)
                </span>
              )}
            </label>
            {members.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => {
                    const active = selectedPeople.includes(m.name);
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() =>
                          setSelectedPeople((prev) =>
                            prev.includes(m.name)
                              ? prev.filter((n) => n !== m.name)
                              : [...prev, m.name]
                          )
                        }
                        className={`flex items-center gap-2 rounded-full border py-1.5 pl-1.5 pr-3.5 text-sm font-medium transition-all ${
                          active
                            ? "border-[#1c1917] bg-[#1c1917] text-white"
                            : "border-[#e8e1d5] bg-white text-[#57534e] hover:border-[#1c1917]/30"
                        }`}
                      >
                        <Avatar src={m.photo} name={m.name} size={26} />
                        {m.name.split(" ")[0]}
                      </button>
                    );
                  })}
                </div>
                <input
                  value={extraPeople}
                  onChange={(e) => setExtraPeople(e.target.value)}
                  placeholder={
                    members.length >= 3
                      ? `Anyone else? e.g. ${members
                          .slice(0, 3)
                          .map((m) => m.name.split(" ")[0])
                          .join(", ")}…`
                      : "Anyone else? Add names, comma separated"
                  }
                  className="mt-2.5 w-full rounded-xl border border-[#e8e1d5] bg-white px-4 py-3 text-[15px] outline-none placeholder:text-[#a8a29e] focus:border-[#1c1917]/40"
                />
              </>
            ) : (
              <input
                value={extraPeople}
                onChange={(e) => setExtraPeople(e.target.value)}
                placeholder="Aarav, Meera, Kabir"
                className="w-full rounded-xl border border-[#e8e1d5] bg-white px-4 py-3 text-[15px] outline-none placeholder:text-[#a8a29e] focus:border-[#1c1917]/40"
              />
            )}
          </div>

          {failedCount > 0 && !uploading && (
            <div className="rounded-2xl bg-red-50 p-4 text-sm">
              <p className="font-semibold text-red-800">
                {failedCount} file{failedCount > 1 ? "s" : ""} didn’t make it
              </p>
              <p className="mt-0.5 text-red-700/80">
                Usually a shaky connection — your finished uploads are safe.
              </p>
              <button
                onClick={retryFailed}
                className="mt-3 rounded-full bg-red-800 px-5 py-2.5 text-sm font-semibold text-white"
              >
                Retry {failedCount > 1 ? `those ${failedCount}` : "it"}
              </button>
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={picks.length === 0 || uploading}
            className="w-full rounded-full bg-[#1c1917] py-4 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40"
          >
            {uploading ? `Uploading ${picks.length} file${picks.length > 1 ? "s" : ""}…` : `Share ${picks.length > 0 ? picks.length + " " : ""}memory${picks.length === 1 ? "" : "ies"}`}
          </button>
          <p className="text-center text-xs text-[#a8a29e]">Straight to storage with real progress — 3 at a time.</p>
        </div>
      </div>
    </div>
  );
}
