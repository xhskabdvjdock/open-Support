import type { Metadata } from "next";
import { Geist, Geist_Mono, IBM_Plex_Sans_Arabic } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Fallback Arabic font if the Thmanyah webfont CDN is unreachable.
// Primary Arabic typeface is "Thmanyah Sans" (خط ثمانية) loaded via CDN below.
const plexArabic = IBM_Plex_Sans_Arabic({
  variable: "--font-arabic-fallback",
  subsets: ["arabic"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "open Support — AI That Can See Your Screen",
  description: "Share your screen, ask questions, and get technical help based on what is actually visible.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      dir="ltr"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} ${plexArabic.variable} h-full antialiased`}
    >
      <head>
        {/* خط ثمانية — Thmanyah Sans / Serif (community web build, served via CDN; not bundled).
            License: Thmanyah owns the font — see https://font.thmanyah.com/licenses.
            For commercial/extended use contact Ask@thmanyah.com. */}
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/@dawod/thmanyah-font-web/index.css"
        />
      </head>
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
