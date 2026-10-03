import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AuthContextProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import PageWrapper from "@/components/PageWrapper";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "dih pics — our album",
  description: "A quiet little corner for the gang's photos and videos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${fraunces.variable} antialiased bg-[#faf8f4] text-[#1c1917] paper-grain`}
      >
        <AuthContextProvider>
          <Navbar />
          <PageWrapper>{children}</PageWrapper>
        </AuthContextProvider>
          <Analytics debug={false} />
      </body>
    </html>
  );
}
