import { CommunityShell } from "@/components/community/shell";
import { CreatorManager } from "@/components/community/forms";
export const metadata = { title: "Creator space · ModHorizon", robots: { index: false, follow: false } };
export default function Page() { return <CommunityShell><CreatorManager /></CommunityShell>; }
