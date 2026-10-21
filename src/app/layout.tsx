import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export const metadata: Metadata = {
  title: "ModHorizon — Minecraft plugins and mods from a prompt",
  description:
    "Describe a Minecraft plugin or mod in plain English. ModHorizon writes readable Java for Paper, Spigot, Fabric, Forge, NeoForge and more, on any supported version.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0d",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
