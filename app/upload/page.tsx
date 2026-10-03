"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/firebase/config";

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
  const [eventName, setEventName] = useState("");
  const [caption, setCaption] = useState("");
  const [people, setPeople] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  // Revoke object URLs on unmount
  useEffect(() => {
    return () => picks.forEach((p) => URL.revokeObjectURL(p.preview));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addFiles = useCallback((list: FileList | File[] | null) => {
    if (!list) return;
    const arr = Array.from(list).filter((f) => f.type.startsWith("image/") || f.type.startsWith("video/"));
    if (arr.length === 0) return;
    setPicks((prev) => [
      ...prev,
      ...arr.map((file) => ({
        file,
        preview: URL.createObjectURL(file),
        kind: (file.type.startsWith("image") ? "image" : "video") as "image" | "video",
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

  const uploadOne = async (p: Pick, i: number) => {
    const file = await compressImage(p.file);
    const form = new FormData();
    form.append("file", file);
    form.append("path", `memories/${user!.uid}/${Date.now()}_${file.name}`);

    // Progress is simulated for the server route (fetch has no upload events);
    // we tick it so the UI feels alive, then complete on response.
    const tick = setInterval(() => {
      setPicks((prev) =>
        prev.map((x, xi) => (xi === i ? { ...x, progress: Math.min(90, x.progress + 12) } : x))
      );
    }, 250);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      if (!res.ok) throw new Error("upload failed");
      const data = await res.json();
      clearInterval(tick);
      setPicks((prev) => prev.map((x, xi) => (xi === i ? { ...x, progress: 100, done: true } : x)));
      return { url: data.url, path: data.path, type: file.type.startsWith("image") ? "image" : "video" };
    } catch (e) {
      clearInterval(tick);
      setPicks((prev) => prev.map((x, xi) => (xi === i ? { ...x, error: "Failed — try again" } : x)));
      throw e;
    }
  };

  const handleUpload = async () => {
    if (picks.length === 0 || !user || uploading) return;
    setUploading(true);
    try {
      // Upload 3 at a time so adding 50+ files doesn't stall or OOM
      const results: Array<{ url: string; path: string; type: string }> = new Array(picks.length);
      for (let s = 0; s < picks.length; s += 3) {
        const batch = picks.slice(s, s + 3);
        const out = await Promise.all(batch.map((p, b) => uploadOne(p, s + b)));
        out.forEach((r, b) => (results[s + b] = r));
      }
      await addDoc(collection(db, "memories"), {
        eventName: eventName.trim() || "Untitled moment",
        media: results,
        mediaUrl: results[0].url,
        mediaType: results[0].type,
        caption: caption.trim(),
        tags: [],
        people: people.split(",").map((t) => t.trim()).filter(Boolean),
        uploadedBy: user.uid,
        userEmail: user.email,
        createdAt: serverTimestamp(),
      });
      router.push("/gallery");
    } catch {
      alert("Some uploads failed. The ones that worked are marked — remove the failed ones and try again.");
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
          <p className="font-medium">Drag photos here, or tap to browse</p>
          <p className="mt-1 text-sm text-[#a8a29e]">Images get auto-compressed · videos upload as-is</p>
        </div>

        {picks.length > 0 && (
          <div className="mt-4 grid grid-cols-3 gap-2.5 sm:grid-cols-4">
            {picks.map((p, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-xl border border-[#e8e1d5] bg-[#f3efe7]">
                {p.kind === "video" ? (
                  <video src={p.preview} muted playsInline className="h-full w-full object-cover" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.preview} alt="" className="h-full w-full object-cover" />
                )}
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
                  <span className="absolute inset-x-1.5 bottom-1.5 rounded-lg bg-red-700/90 px-2 py-1 text-center text-[10px] font-semibold text-white">
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
            <label className="mb-1.5 block text-sm font-medium">Who was there? <span className="font-normal text-[#a8a29e]">(comma separated)</span></label>
            <input
              value={people}
              onChange={(e) => setPeople(e.target.value)}
              placeholder="Aarav, Meera, Kabir"
              className="w-full rounded-xl border border-[#e8e1d5] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#1c1917]/40"
            />
          </div>

          <button
            onClick={handleUpload}
            disabled={picks.length === 0 || uploading}
            className="w-full rounded-full bg-[#1c1917] py-4 text-[15px] font-semibold text-white transition-all hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-40"
          >
            {uploading ? `Uploading ${picks.length} file${picks.length > 1 ? "s" : ""}…` : `Share ${picks.length > 0 ? picks.length + " " : ""}memory${picks.length === 1 ? "" : "ies"}`}
          </button>
          <p className="text-center text-xs text-[#a8a29e]">Large batches upload 3 at a time so nothing crashes.</p>
        </div>
      </div>
    </div>
  );
}
