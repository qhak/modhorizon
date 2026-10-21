"use client";
import Link from "next/link";
export default function DashboardError({ reset }: { reset: () => void }) {
  return <main style={{ padding: 40 }}><h1>Workspace temporarily unavailable.</h1><p>Your stored projects have been kept. Retry loading the dashboard.</p><button className="button button-primary" onClick={reset}>Try again</button> <Link href="/">Back to homepage</Link></main>;
}
