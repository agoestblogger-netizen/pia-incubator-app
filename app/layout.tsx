import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-stats",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
});

export const metadata: Metadata = {
  title: "PIA Incubator — Pegadaian Innovation Award Season 12",
  description: "Portal program inkubasi & akselerasi inovasi Pegadaian Innovation Award (PIA) Season 12 Tahun 2026",
};

import { ToastProvider } from "@/components/ui/ToastProvider";
import { NavigationTransitionProvider } from "@/components/ui/NavigationTransitionProvider";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} ${jetbrainsMono.variable} antialiased bg-[#F8FAFC] text-gray-900 font-sans`}
      >
        <ToastProvider>
          <NavigationTransitionProvider>
            {children}
          </NavigationTransitionProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
