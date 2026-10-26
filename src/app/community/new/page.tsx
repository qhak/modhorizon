import { CommunityShell } from "@/components/community/shell";
import { PublishEditor } from "@/components/community/forms";
export const metadata = { title: "Share a creation · ModHorizon", robots: { index: false, follow: false } };
export default function Page() { return <CommunityShell><PublishEditor /></CommunityShell>; }
