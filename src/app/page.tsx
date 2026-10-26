import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  CircleHelp,
  Lightbulb,
  Code2,
  FileCode2,
  FileText,
  FolderOpen,
  Layers,
  Network,
  Plus,
  Server,
  Sparkles,
  Wrench,
  WandSparkles,
  UserRound,
} from "lucide-react";
import {
  MINECRAFT_RELEASES,
  PLATFORMS,
  PLATFORM_GROUPS,
  PLATFORM_IDS,
} from "@/lib/platforms";
import { SITE_MEDIA } from "@/lib/site-media";
import { Hero } from "@/components/landing/hero";
import { VideoSlot } from "@/components/landing/media-slot";
import { ExampleLibrary } from "@/components/landing/example-library";
import { VersionChecker } from "@/components/landing/version-checker";
import { ContentGallery } from "@/components/landing/content-gallery";
import { RevealOnScroll } from "@/components/landing/reveal-on-scroll";
import { VoidBackdrop } from "@/components/void-backdrop";
import { BrandMark } from "@/components/brand-mark";
import "./landing.css";

const coveredReleases = MINECRAFT_RELEASES.filter((release) =>
  PLATFORM_IDS.some((id) => PLATFORMS[id].kind !== "proxy" && PLATFORMS[id].versions.includes(release)),
);
const stats = [
  { value: `${coveredReleases.length}`, label: "Minecraft releases", icon: "releases" as const },
  { value: `${PLATFORM_IDS.length}`, label: "loaders and platforms", icon: "loaders" as const },
  { value: `${coveredReleases.at(-1)} – ${coveredReleases[0]}`, label: "versions", icon: "range" as const },
];
const GROUP_ICONS = { plugin: Server, proxy: Network, mod: Blocks };

const faqs = [
  {
    q: "Do I need to know how to code?",
    a: "No. Pick a loader and a version, say what the project should do, and check every file before you use it.",
  },
  {
    q: "Do I get a .jar?",
    a: "Yes, when a build service is connected. Without one you get the source code only.",
  },
  {
    q: "What if a build fails?",
    a: "The errors go back to the model, which gets up to three tries to fix them.",
  },
  {
    q: "Is the generated code safe?",
    a: "Treat it like any plugin or mod you download. Read it and test it on a private server first.",
  },
];

const javaSnippet = [
  ["kw", "@Mod"],
  ["", "public final class RubyGear {"],
  ["", "  public RubyGear(IEventBus bus) {"],
  ["", "    ITEMS.register(bus);"],
  ["", "    BLOCKS.register(bus);"],
  ["", "  }"],
  ["", "}"],
] as const;

function Logo() {
  return (
    <Link href="/" className="lp-brand" aria-label="ModHorizon home">
      <BrandMark size={24} />
      <span>ModHorizon</span>
    </Link>
  );
}

function SectionHeading({ title, description, icon: Icon }: { title: string; description?: string; icon: typeof Sparkles }) {
  return (
    <div className="section-head">
      <span className="section-icon" aria-hidden="true"><Icon size={18} /></span>
      <h2 className="section-heading">{title}</h2>
      {description && <p className="section-subheading">{description}</p>}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="lp">
      <VoidBackdrop planet={false} />
      <RevealOnScroll />
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <Logo />
          <nav aria-label="Primary">
            <a className="nav-link" href="/explore">Explore</a>
            <a className="nav-link" href="#examples">Examples</a>
            <a className="nav-link" href="#versions">Compatibility</a>
            <Link className="nav-link" href="/pricing">Pricing</Link>
          </nav>
          <div className="nav-actions">
            <Link href="/account" className="nav-account" aria-label="Account"><UserRound size={17} aria-hidden="true" /><span>Account</span></Link>
            <Link href="/create" className="nav-cta">Start creating <ArrowRight size={15} aria-hidden="true" /></Link>
          </div>
        </div>
      </header>

      <main>
        <Hero stats={stats} />

        <section id="create" className="lp-section" data-reveal>
          <SectionHeading title="Make it your Minecraft." description="Choose a starting point. Bring your own idea." icon={Blocks} />
          <ContentGallery />
        </section>

        <section id="examples" className="lp-section" data-reveal>
          <SectionHeading title="A little inspiration goes a long way." description="Find an idea, make it yours, and open it in the workspace." icon={Lightbulb} />
          <ExampleLibrary />
        </section>

        <section id="features" className="lp-section" data-reveal>
          <SectionHeading title="Your idea. A real project." description="Describe it, review the source, and build when your service is connected." icon={WandSparkles} />
          <div className="bento-grid">
            <article className="bento-card">
              <span className="bento-badge">Core</span>
              <span className="feature-icon feature-icon-blue"><WandSparkles size={23} aria-hidden="true" /></span>
              <h3 className="bento-title">One prompt, a full project</h3>
              <p className="bento-description">ModHorizon writes the full project for your loader: the main class, listeners and the plugin or mod file.</p>
              <div className="mock mock-composer" aria-hidden="true">
                <p>Add ruby ore, a ruby ingot and a ruby sword stronger than iron<span className="mock-caret" /></p>
                <div className="mock-bar">
                  <span>Fabric</span><span>1.21.11</span><span>Claude Opus 5.5</span>
                  <span className="mock-go">Generate <ArrowRight size={13} aria-hidden="true" /></span>
                </div>
              </div>
            </article>

            <article className="bento-card">
              <span className="bento-badge">Builds</span>
              <span className="feature-icon feature-icon-amber"><Wrench size={23} aria-hidden="true" /></span>
              <h3 className="bento-title">Automatic fixes</h3>
              <p className="bento-description">If a build fails, the errors go back to the model. Up to three retries.</p>
              <div className="mock mock-log" aria-hidden="true">
                <code><span className="dim">01</span> Validating 6 source files</code>
                <code><span className="dim">02</span> Fabric 1.21.11 · Java 21</code>
                <code className="warn"><span className="dim">03</span> 1 error · retry 1 of 3</code>
                <code className="ok"><span className="dim">04</span> BUILD SUCCESSFUL · rubygear.jar</code>
              </div>
            </article>

            <article className="bento-card">
              <span className="bento-badge">Source</span>
              <span className="feature-icon feature-icon-green"><Code2 size={23} aria-hidden="true" /></span>
              <h3 className="bento-title">Readable source</h3>
              <p className="bento-description">Every file is shown before you download anything.</p>
              <div className="mock mock-ide" aria-hidden="true">
                <div className="ide-tree">
                  <span><FolderOpen size={13} /> RubyGear</span>
                  <span className="active"><FileCode2 size={13} /> RubyGear.java</span>
                  <span><FileCode2 size={13} /> ModItems.java</span>
                  <span><FileText size={13} /> neoforge.mods.toml</span>
                  <span><FileText size={13} /> en_us.json</span>
                </div>
                <pre>
                  {javaSnippet.map(([kind, line], index) => (
                    <code key={index}>
                      <span className="dim">{String(index + 9).padStart(2, " ")}</span>
                      <span className={kind === "kw" ? "kw" : undefined}>{line}</span>
                    </code>
                  ))}
                </pre>
              </div>
            </article>
          </div>
        </section>

        <section id="versions" className="lp-section" data-reveal>
          <SectionHeading title="Find your perfect fit." description="Check your loader and Minecraft version before you start." icon={Layers} />
          <VersionChecker />
          <details className="platform-directory">
            <summary>Browse all loaders and version ranges <Plus size={16} aria-hidden="true" /></summary>
            <div className="loader-table">
              {PLATFORM_GROUPS.map((group) => {
                const GroupIcon = GROUP_ICONS[group.kind];
                return (
                  <div key={group.kind} className="loader-group">
                    <h3><GroupIcon size={15} aria-hidden="true" /> {group.label}</h3>
                    <ul>
                      {group.ids.map((id) => {
                        const { label, summary, versions, kind } = PLATFORMS[id];
                        return (
                          <li key={id}>
                            <div>
                              <strong>{label}</strong>
                              <span>{summary}</span>
                            </div>
                            <code>
                              {kind === "proxy" ? `API ${versions.at(-1)} – ${versions[0]}` : `${versions.at(-1)} – ${versions[0]}`}
                              <small>{versions.length} versions</small>
                            </code>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </details>
        </section>

        <section id="faq" className="lp-section faq-section" data-reveal>
          <SectionHeading title="FAQ" icon={CircleHelp} />
          <div className="faq-list">
            {faqs.map((item) => (
              <details key={item.q} className="faq-item">
                <summary className="faq-q">
                  {item.q}
                  <Plus className="faq-icon" aria-hidden="true" />
                </summary>
                <p className="faq-a">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="cta-section">
          <VideoSlot src={SITE_MEDIA.cta} className="cta-video" />
          <div className="cta-overlay" aria-hidden="true" />
          <div className="cta-container">
            <div className="cta-content">
              <h2 className="cta-heading">Make your first project</h2>
              <div className="cta-actions">
                <Link href="/create" className="btn-cta-primary">
                  Start creating <ArrowRight size={18} aria-hidden="true" />
                </Link>
              </div>
            </div>
            <footer className="footer-content">
              <div className="footer-top">
                <Logo />
                <div className="footer-links">
                  <a className="footer-link" href="#features">Features</a>
                  <span className="footer-separator">·</span>
                  <a className="footer-link" href="#versions">Versions</a>
                  <span className="footer-separator">·</span>
                  <Link className="footer-link" href="/pricing">Pricing</Link>
                  <span className="footer-separator">·</span>
                  <a className="footer-link" href="#faq">FAQ</a>
                  <span className="footer-separator">·</span>
                  <Link className="footer-link" href="/media/types/CREDITS.md" prefetch={false}>Image credits</Link>
                </div>
              </div>
              <p className="footer-copyright">© {new Date().getFullYear()} ModHorizon · Not affiliated with Mojang Studios or Microsoft</p>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
