import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  CircleHelp,
  Lightbulb,
  Zap,
  Code2,
  Coffee,
  FileCode2,
  FileText,
  FolderOpen,
  Layers,
  MessageSquareText,
  Network,
  Play,
  Plus,
  Server,
  ShieldCheck,
  Sparkles,
  Wrench,
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
import { UseCaseTabs } from "@/components/landing/use-case-tabs";
import { ContentSlider } from "@/components/landing/content-slider";
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
    q: "Which loaders and versions are supported?",
    a: `${PLATFORM_IDS.map((id) => PLATFORMS[id].label).join(", ")}, on Minecraft ${coveredReleases.at(-1)} to ${coveredReleases[0]}.`,
  },
  {
    q: "What if a loader doesn't support my version?",
    a: "The workspace tells you, and the Why? button explains the reason.",
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

function SectionHeading({ title, icon: Icon }: { title: string; icon: typeof Sparkles }) {
  return (
    <div className="section-head">
      <span className="section-icon" aria-hidden="true"><Icon size={18} /></span>
      <h2 className="section-heading">{title}</h2>
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
            <a className="nav-link" href="#features">Features</a>
            <a className="nav-link" href="#versions">Versions</a>
            <a className="nav-link" href="#examples">Examples</a>
            <Link className="nav-link" href="/pricing">Pricing</Link>
            <a className="nav-link" href="#faq">FAQ</a>
          </nav>
          <Link href="/create" className="nav-cta">Open workspace <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
      </header>

      <main>
        <Hero stats={stats} />

        <section id="create" className="lp-section" data-reveal>
          <SectionHeading title="What you can make" icon={Sparkles} />
          <ContentSlider />
        </section>

        <section id="features" className="lp-section" data-reveal>
          <SectionHeading title="Features" icon={Zap} />
          <div className="bento-grid">
            <article className="bento-card bento-large">
              <span className="bento-badge">Core</span>
              <Sparkles className="bento-icon" aria-hidden="true" />
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
              <span className="bento-badge bento-badge-green">12 loaders</span>
              <Layers className="bento-icon" aria-hidden="true" />
              <h3 className="bento-title">Every loader</h3>
              <p className="bento-description">Plugins, proxies and mods.</p>
              <div className="mock mock-loaders" aria-hidden="true">
                {PLATFORM_GROUPS.map((group) => (
                  <div key={group.kind}>
                    <small>{group.label}</small>
                    <span>{group.ids.map((id) => PLATFORMS[id].label).join(" · ")}</span>
                  </div>
                ))}
              </div>
            </article>

            <article className="bento-card">
              <span className="bento-badge">Builds</span>
              <Wrench className="bento-icon" aria-hidden="true" />
              <h3 className="bento-title">Automatic fixes</h3>
              <p className="bento-description">If a build fails, the errors go back to the model. Up to three retries.</p>
              <div className="mock mock-log" aria-hidden="true">
                <code><span className="dim">01</span> Validating 6 source files</code>
                <code><span className="dim">02</span> Fabric 1.21.11 · Java 21</code>
                <code className="warn"><span className="dim">03</span> 1 error · retry 1 of 3</code>
                <code className="ok"><span className="dim">04</span> BUILD SUCCESSFUL · rubygear.jar</code>
              </div>
            </article>

            <article className="bento-card bento-large">
              <span className="bento-badge">Source</span>
              <Code2 className="bento-icon" aria-hidden="true" />
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

            <div className="bento-small-row">
              <div className="bento-small">
                <Coffee aria-hidden="true" />
                <h4 className="bento-title-small">Java 8 to 25</h4>
                <p className="bento-description-small">Picked for your version.</p>
              </div>
              <div className="bento-small">
                <MessageSquareText aria-hidden="true" />
                <h4 className="bento-title-small">Follow-up edits</h4>
                <p className="bento-description-small">Change it in the same chat.</p>
              </div>
              <div className="bento-small">
                <ShieldCheck aria-hidden="true" />
                <h4 className="bento-title-small">Safe file types</h4>
                <p className="bento-description-small">No build scripts or binaries.</p>
              </div>
              <div className="bento-small">
                <Play aria-hidden="true" />
                <h4 className="bento-title-small">Testing guide</h4>
                <p className="bento-description-small">Steps for servers, proxies and clients.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="versions" className="lp-section" data-reveal>
          <SectionHeading title="Supported versions" icon={Layers} />
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
        </section>

        <section id="examples" className="lp-section" data-reveal>
          <SectionHeading title="Examples" icon={Lightbulb} />
          <UseCaseTabs />
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
                  Open the workspace <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a href="#versions" className="btn-cta-secondary"><Layers size={18} aria-hidden="true" /> Supported versions</a>
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
                </div>
              </div>
              <div className="ft-platforms">
                <span className="ft-platforms-label">Platforms</span>
                {PLATFORM_IDS.map((id) => <span key={id} className="ft-platform">{PLATFORMS[id].label}</span>)}
              </div>
              <p className="footer-copyright">© {new Date().getFullYear()} ModHorizon · Not affiliated with Mojang Studios or Microsoft</p>
            </footer>
          </div>
        </section>
      </main>
    </div>
  );
}
