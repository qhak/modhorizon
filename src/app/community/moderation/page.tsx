import { CommunityShell } from "@/components/community/shell";
import { ModeratorQueue } from "@/components/community/interactions";
export const metadata = { title: "Community moderation · ModHorizon", robots: { index: false, follow: false } };
export default function Page() { return <CommunityShell><ModeratorQueue /></CommunityShell>; }
