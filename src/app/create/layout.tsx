import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Workspace — ModHorizon",
};

export default function CreateLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
