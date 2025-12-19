"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push("/home");
      } else {
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  return (
      <div className="flex min-h-screen items-center justify-center">
          <div className="w-16 h-16 border-4 border-dih-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
  );
}
