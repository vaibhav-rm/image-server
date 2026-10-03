import React from "react";
import { cn } from "@/lib/media";

/* ---------- Shared warm UI primitives ---------- */

export function Card({
  children,
  className,
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={cn("card", onClick && "card-hover cursor-pointer", className)}
    >
      {children}
    </div>
  );
}

export function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a8a29e]">
      {children}
    </p>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton rounded-2xl", className)} />;
}

export function TileSkeleton() {
  const heights = ["h-56", "h-72", "h-48", "h-64", "h-80", "h-60"];
  return (
    <div className="masonry" aria-hidden>
      {heights.concat(heights).map((h, i) => (
        <Skeleton key={i} className={`${h} w-full`} />
      ))}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#f3efe7] text-xl">
        <span aria-hidden>◍</span>
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-xl">{title}</h3>
      {hint && <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#78716c]">{hint}</p>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

export function Pill({
  active,
  children,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-[#1c1917] bg-[#1c1917] text-white"
          : "border-[#e8e1d5] bg-white text-[#57534e] hover:border-[#1c1917]/40 hover:text-[#1c1917]"
      )}
    >
      {children}
    </button>
  );
}

export function Avatar({
  src,
  name,
  size = 40,
}: {
  src?: string;
  name?: string;
  size?: number;
}) {
  const seed = encodeURIComponent(name || "friend");
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src || `https://api.dicebear.com/9.x/thumbs/svg?seed=${seed}`}
      alt={name || "friend"}
      width={size}
      height={size}
      loading="lazy"
      className="rounded-full border border-[#e8e1d5] bg-[#f3efe7] object-cover"
      style={{ width: size, height: size }}
    />
  );
}
