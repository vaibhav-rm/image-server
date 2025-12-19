"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function PageWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isImmersivePage = pathname === "/login" || pathname === "/pending" || pathname.startsWith("/memory/");

  return (
    <main className={`relative pb-12 ${isImmersivePage ? "" : "pt-24 md:pt-32"}`}>
      {children}
    </main>
  );
}
