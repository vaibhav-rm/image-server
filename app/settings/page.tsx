"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Avatar } from "@/components/ui";
import { uploadWithRetry } from "@/lib/upload";

async function shrinkAvatar(file: File): Promise<File> {
  try {
    const bitmap = await createImageBitmap(file);
    const max = 512;
    const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob: Blob | null = await new Promise((res) =>
      canvas.toBlob(res, "image/jpeg", 0.85)
    );
    if (!blob) return file;
    return new File([blob], "avatar.jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

export default function SettingsPage() {
  const { user, loading, profile, saveProfile, logOut } = useAuth();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement | null>(null);

  const [name, setName] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const seeded = useRef(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  // Seed form from live profile once.
  useEffect(() => {
    if (profile && !seeded.current) {
      seeded.current = true;
      setName(profile.displayName || "");
      setPhoto(profile.photoURL);
    }
  }, [profile]);

  if (loading || !user) return null;

  const dirty =
    seeded.current &&
    (name.trim() !== (profile?.displayName || "") || photo !== profile?.photoURL);

  const pickFile = async (list: FileList | null) => {
    const f = list?.[0];
    if (!f || !user) return;
    setUploading(true);
    setError(null);
    try {
      const small = await shrinkAvatar(f);
      const up = await uploadWithRetry(
        small,
        `avatars/${user.uid}/${Date.now()}_avatar.jpg`
      );
      setPhoto(up.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't upload that photo — try a different one.");
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      await saveProfile({ displayName: name.trim(), photoURL: photo });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Couldn't save — check your connection and try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="relative z-10 mx-auto max-w-xl">
      <button
        onClick={() => router.back()}
        className="mb-4 text-sm font-medium text-[#78716c] hover:text-[#1c1917]"
      >
        ← Back
      </button>

      <h1 className="font-[family-name:var(--font-display)] text-[32px] font-medium tracking-tight">
        Settings
      </h1>
      <p className="mt-1 text-[15px] text-[#78716c]">
        How you show up in the album.
      </p>

      <div className="card mt-5 p-6">
        {/* Photo */}
        <div className="flex items-center gap-5">
          <Avatar src={photo || undefined} name={name || profile?.email || "you"} size={84} />
          <div>
            <p className="text-sm font-semibold">Profile photo</p>
            <p className="mt-0.5 text-[13px] text-[#a8a29e]">
              {photo === profile?.googlePhotoURL && profile?.googlePhotoURL
                ? "Using your Google photo"
                : photo
                  ? "Using a custom photo"
                  : "No photo yet"}
            </p>
            <div className="mt-2.5 flex flex-wrap gap-2">
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="rounded-full bg-[#1c1917] px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
              >
                {uploading ? "Uploading…" : "Upload new"}
              </button>
              {profile?.googlePhotoURL && photo !== profile.googlePhotoURL && (
                <button
                  onClick={() => setPhoto(profile.googlePhotoURL)}
                  className="rounded-full border border-[#e8e1d5] bg-white px-4 py-2 text-[13px] font-medium hover:border-[#1c1917]/30"
                >
                  Use Google photo
                </button>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  pickFile(e.target.files);
                  e.target.value = "";
                }}
              />
            </div>
          </div>
        </div>

        {profile?.googlePhotoURL && (
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-[#faf8f4] p-3">
            <Avatar src={profile.googlePhotoURL} name="google" size={36} />
            <div className="min-w-0">
              <p className="text-[13px] font-medium">Your Google photo</p>
              <p className="truncate text-xs text-[#a8a29e]">The one on your Google account</p>
            </div>
          </div>
        )}

        {/* Name */}
        <div className="mt-6">
          <label className="mb-1.5 block text-sm font-medium">Display name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="What should the gang call you?"
            maxLength={40}
            className="w-full rounded-xl border border-[#e8e1d5] bg-white px-4 py-3 text-[15px] outline-none focus:border-[#1c1917]/40"
          />
        </div>

        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium">Email</label>
          <input
            value={profile?.email || user.email || ""}
            disabled
            className="w-full rounded-xl border border-[#e8e1d5] bg-[#faf8f4] px-4 py-3 text-[15px] text-[#a8a29e]"
          />
        </div>

        {error && (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        )}

        <button
          onClick={handleSave}
          disabled={!dirty || saving || uploading}
          className="mt-6 w-full rounded-full bg-[#1c1917] py-3.5 text-[15px] font-semibold text-white disabled:opacity-40"
        >
          {saving ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>

      <button
        onClick={() => logOut()}
        className="mt-4 w-full rounded-full border border-[#e8e1d5] bg-white py-3 text-sm font-medium text-[#78716c] hover:border-[#1c1917]/30"
      >
        Log out
      </button>
    </div>
  );
}
