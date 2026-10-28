import { CommunityShell } from "@/components/community/shell";
import { ProfileEditor } from "@/components/community/forms";
export const metadata = { title: "Your public profile · ModHorizon", robots: { index: false, follow: false } };
export default function Page() { return <CommunityShell><ProfileEditor /></CommunityShell>; }
