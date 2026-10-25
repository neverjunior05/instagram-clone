import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import { getUser } from "@/lib/auth";
import Shell from "@/components/Shell";

export const metadata: Metadata = {
  title: { default: "Lumio — share light", template: "%s · Lumio" },
  description: "Lumio is an independent demo photo & video sharing app. All content is fictional.",
  manifest: "/manifest.json",
  openGraph: { title: "Lumio", description: "A cinematic, media-first sharing demo.", type: "website" },
};
export const viewport: Viewport = { themeColor: "#0A0A0C", width: "device-width", initialScale: 1 };

// Applies stored theme + reduce-motion before paint to avoid flashes.
const boot = `try{var t=localStorage.getItem('lumio-theme')||'dark';if(t==='auto')t=matchMedia('(prefers-color-scheme: light)').matches?'light':'dark';document.documentElement.dataset.theme=t;if(localStorage.getItem('lumio-reduce-motion')==='1')document.documentElement.classList.add('reduce-motion')}catch(e){}`;

export default async function RootLayout({ children }: { children: ReactNode }) {
  const user = await getUser().catch(() => null);
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link href="https://fonts.googleapis.com/css2?family=DM+Mono&family=Inter:wght@400;500;600&family=Manrope:wght@700;800&display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{ __html: boot }} />
      </head>
      <body className="min-h-screen antialiased">
        <Shell user={user ? { username: user.username, avatar: user.avatar, role: user.role } : null}>{children}</Shell>
      </body>
    </html>
  );
}
