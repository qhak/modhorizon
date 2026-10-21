import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "ModHorizon — Your Paper plugin studio",
  description:
    "Turn an idea into a Paper plugin. Generate, inspect, and build Minecraft plugins in one focused workspace.",
};
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
