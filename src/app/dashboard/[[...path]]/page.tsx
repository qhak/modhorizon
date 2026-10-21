import { headers, cookies } from "next/headers";
import { notFound } from "next/navigation";
import { Dashboard, LocalAccess, type DashboardScreen } from "@/components/dashboard";
import Workspace from "@/components/workspace";
import { localDashboardEnabled, SESSION_COOKIE } from "@/lib/dashboard-auth";
import { dashboardDatabase } from "@/lib/dashboard-db";
import "../dashboard.css";

export const runtime = "nodejs";
export default async function DashboardPage({ params }: { params: Promise<{ path?: string[] }> }) {
  const path = (await params).path ?? [];
  const screens: Record<string, DashboardScreen> = { "": "home", projects: "projects", new: "new", credits: "credits", settings: "settings" };
  const managedId = path.length === 2 && path[0] === "projects" && /^[a-f0-9-]{36}$/.test(path[1]) ? path[1] : undefined;
  const screen = path.length <= 1 ? screens[path[0] ?? ""] : undefined;
  if (!screen && !managedId) notFound();
  const available = localDashboardEnabled((await headers()).get("host"));
  if (!available) return <LocalAccess available={false} />;
  const db = await dashboardDatabase();
  const ownerId = db.session((await cookies()).get(SESSION_COOKIE)?.value);
  if (!ownerId) return <LocalAccess available />;
  if (managedId) {
    try { db.get(ownerId, managedId); } catch { notFound(); }
    return <Workspace key={managedId} managedId={managedId} profile={db.profile()} />;
  }
  return <Dashboard key={screen} screen={screen!} initialProfile={db.profile()} />;
}
