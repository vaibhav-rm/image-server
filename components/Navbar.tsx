"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { Avatar } from "./ui";
import { cn } from "@/lib/media";

export default function Navbar() {
  const pathname = usePathname();
  const { user, profile, logOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);

  if (pathname === "/login" || pathname === "/pending") return null;
  if (!user) return null;

  const links = [
    { href: "/home", label: "Home" },
    { href: "/gallery", label: "Gallery" },
    { href: "/memories", label: "Timeline" },
    { href: "/friends", label: "Gang" },
  ];

  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className="mx-auto max-w-6xl px-3 pt-3 sm:px-5">
        <nav className="flex items-center justify-between rounded-2xl border border-[#e8e1d5]/90 bg-[#faf8f4]/85 py-2.5 pl-4 pr-2.5 shadow-[0_8px_30px_-18px_rgba(28,25,23,0.4)] backdrop-blur-xl">
          <Link href="/home" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#1c1917] font-[family-name:var(--font-display)] text-lg text-[#faf8f4]">
              d
            </span>
            <span className="leading-none">
              <span className="block font-[family-name:var(--font-display)] text-[17px] font-semibold tracking-tight">
                dih pics
              </span>
              <span className="block text-[11px] text-[#a8a29e]">our little album</span>
            </span>
          </Link>

          <div className="hidden items-center gap-1 md:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition-colors",
                  pathname === l.href || pathname.startsWith(l.href + "/")
                    ? "bg-[#1c1917] text-white"
                    : "text-[#57534e] hover:bg-[#1c1917]/5 hover:text-[#1c1917]"
                )}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/upload"
              className="ml-2 rounded-full bg-[#b4540a] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#92400e]"
            >
              + Add photos
            </Link>
            <div className="relative ml-2">
              <button onClick={() => setMenu((v) => !v)} className="block rounded-full">
                <Avatar
                  src={profile?.photoURL || user.photoURL || undefined}
                  name={profile?.displayName || user.displayName || user.email || "you"}
                  size={34}
                />
              </button>
              {menu && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setMenu(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-52 overflow-hidden rounded-2xl border border-[#e8e1d5] bg-white shadow-xl">
                    <div className="border-b border-[#f3efe7] px-4 py-3">
                      <p className="truncate text-sm font-semibold">
                        {profile?.displayName || user.displayName || "Friend"}
                      </p>
                      <p className="truncate text-xs text-[#a8a29e]">{user.email}</p>
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setMenu(false)}
                      className="block w-full px-4 py-3 text-left text-sm text-[#57534e] hover:bg-[#faf8f4]"
                    >
                      Settings
                    </Link>
                    <button
                      onClick={() => logOut()}
                      className="w-full px-4 py-3 text-left text-sm text-[#57534e] hover:bg-[#faf8f4]"
                    >
                      Log out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 md:hidden">
            <Link
              href="/upload"
              className="rounded-full bg-[#b4540a] px-3.5 py-2 text-[13px] font-semibold text-white"
            >
              + Add
            </Link>
            <button
              onClick={() => setOpen((v) => !v)}
              aria-label="Menu"
              className="flex h-9 w-9 items-center justify-center rounded-full border border-[#e8e1d5] bg-white"
            >
              <span className="space-y-1">
                <span className="block h-0.5 w-4 bg-[#1c1917]" />
                <span className="block h-0.5 w-4 bg-[#1c1917]" />
              </span>
            </button>
          </div>
        </nav>

        {open && (
          <div className="mt-2 overflow-hidden rounded-2xl border border-[#e8e1d5] bg-white shadow-xl md:hidden">
            {[...links, { href: "/upload", label: "Add photos" }].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "block border-b border-[#f3efe7] px-5 py-3.5 text-[15px] last:border-0",
                  pathname === l.href ? "bg-[#faf8f4] font-semibold" : "text-[#44403c]"
                )}
              >
                {l.label}
              </Link>
            ))}
            <Link
              href="/settings"
              onClick={() => setOpen(false)}
              className="block border-b border-[#f3efe7] px-5 py-3.5 text-[15px] text-[#44403c]"
            >
              Settings
            </Link>
            <button
              onClick={() => logOut()}
              className="block w-full px-5 py-3.5 text-left text-[15px] text-[#78716c]"
            >
              Log out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
