import { notFound } from "next/navigation";
import { Dashboard, type DashboardScreen } from "@/components/dashboard";
import "../../dashboard/dashboard.css";

/** Public UI only: never reads sessions, SQLite, browser history, or private projects. */
export default async function PublicPreview({ params }: { params: Promise<{ path?: string[] }> }) {
  const path = (await params).path ?? [];
  const screens: Record<string, DashboardScreen> = { "": "home", projects: "projects", new: "new", credits: "credits", settings: "settings" };
  const screen = path.length <= 1 ? screens[path[0] ?? ""] : undefined;
  if (!screen) notFound();
  return <Dashboard key={screen} screen={screen} preview initialProfile={{ displayName: "", credits: null, mode: "local" }} />;
}
