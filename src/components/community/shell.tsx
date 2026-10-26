import Link from "next/link";
import { ArrowRight, Compass, UserRound } from "lucide-react";
import { BrandMark } from "@/components/brand-mark";
import { VoidBackdrop } from "@/components/void-backdrop";
import "@/app/community.css";

export function CommunityShell({ children, preview = false }: { children: React.ReactNode; preview?: boolean }) {
  return <div className="cm-shell"><VoidBackdrop planet={false} />
    <header className="cm-nav"><div className="cm-nav-inner">
      <Link className="cm-brand" href="/"><BrandMark size={26} /><span>ModHorizon</span></Link>
      <nav aria-label="Community navigation"><Link href="/explore"><Compass size={15} />Explore</Link><Link href="/create">Create</Link><Link href="/community">My showcases</Link></nav>
      <div className="cm-nav-actions"><Link href="/community/profile" className="cm-account" aria-label="Your creator profile"><UserRound size={17} /></Link><Link href="/community/new" className="cm-button cm-button-primary">Share a creation <ArrowRight size={14} /></Link></div>
    </div></header>
    {preview && <div className="cm-preview-notice" role="note">Design preview · Sample projects and images. <Link href="/explore">Browse published projects →</Link></div>}
    <main className="cm-main">{children}</main>
    <footer className="cm-footer"><Link href="/"><BrandMark size={18} />ModHorizon</Link><p>Minecraft projects from the community.</p><div><Link href="/explore">Explore</Link><Link href="/community">Creator space</Link><Link href="/create">Start creating</Link></div></footer>
  </div>;
}
