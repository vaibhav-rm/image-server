"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

export default function PageWrapper({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const bare = pathname === "/login" || pathname === "/pending";

  return (
    <main className={bare ? "relative" : "relative mx-auto max-w-6xl px-3 pb-16 pt-20 sm:px-5 sm:pt-24"}>
      {children}
    </main>
  );
}
