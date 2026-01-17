import type { Metadata } from "next";
import { Inter, Orbitron, Space_Grotesk } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import { AuthContextProvider } from "@/context/AuthContext";
import Navbar from "@/components/Navbar";
import PageWrapper from "@/components/PageWrapper";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Dih Pics",
  description: "A place where gang's memories are stored",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${orbitron.variable} ${spaceGrotesk.variable} antialiased bg-dih-bg text-dih-fg selection:bg-dih-primary selection:text-black`}
      >
          <AuthContextProvider>
             <Navbar />
             <PageWrapper>
                {children}
             </PageWrapper>
          </AuthContextProvider>
          <Analytics />
      </body>
    </html>
  );
}
