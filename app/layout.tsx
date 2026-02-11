import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "https://openhistoria.com";

export const metadata: Metadata = {
  title: {
    default: "Open Historia - AI Grand Strategy Game",
    template: "%s | Open Historia",
  },
  description:
    "An open-source AI-powered grand strategy game spanning all of human history. Command nations, wage wars, forge alliances, and rewrite history with an intelligent Game Master.",
  keywords: [
    "grand strategy",
    "AI game",
    "strategy game",
    "historical simulation",
    "open source",
    "EU4",
    "Paradox",
    "geopolitics",
    "war game",
    "diplomacy",
  ],
  authors: [{ name: "Open Historia" }],
  creator: "Open Historia",
  metadataBase: new URL(SITE_URL),
  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: "Open Historia",
    title: "Open Historia - AI Grand Strategy Game",
    description:
      "Command nations across all of history with an AI Game Master. Open-source grand strategy in your browser.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Open Historia - AI Grand Strategy Game",
    description:
      "Command nations across all of history with an AI Game Master. Open-source grand strategy in your browser.",
  },
  robots: {
    index: true,
    follow: true,
  },
  alternates: {
    canonical: SITE_URL,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
