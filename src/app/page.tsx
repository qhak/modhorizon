import Link from "next/link";
import {
  ArrowRight,
  Blocks,
  Code2,
  Coffee,
  Layers,
  ListChecks,
  Network,
  Server,
  Sparkles,
  Wrench,
  FileCode2,
  FileText,
  FolderOpen,
  MessageSquareText,
  Play,
  Plus,
  ShieldCheck,
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
import { VersionChecker } from "@/components/landing/version-checker";
import "./landing.css";

const coveredReleases = MINECRAFT_RELEASES.filter((release) =>
  PLATFORM_IDS.some((id) => PLATFORMS[id].kind !== "proxy" && PLATFORMS[id].versions.includes(release)),
);
const stats = [
  { value: `${coveredReleases.length}`, label: "Minecraft releases", icon: "releases" as const },
  { value: `${PLATFORM_IDS.length}`, label: "Loaders & platforms", icon: "loaders" as const },
  { value: `${coveredReleases.at(-1)}–${coveredReleases[0]}`, label: "Version range", icon: "range" as const },
];
const GROUP_ICONS = { plugin: Server, proxy: Network, mod: Blocks };

const faqs = [
  {
    q: "Do I need to know how to code?",
    a: "No. Describe what should happen in game, such as the trigger, the effect and how long it lasts, and ModHorizon writes the project. The Java stays readable if you want to learn from it or edit it by hand.",
  },
  {
    q: "Which loaders and versions are supported?",
    a: `Paper, Folia, Purpur, Spigot, Bukkit and Sponge plugins; Velocity and BungeeCord proxy plugins; and Fabric, Quilt, Forge and NeoForge mods. Every stable Minecraft release each loader shipped is available, from ${coveredReleases.at(-1)} up to ${coveredReleases[0]}.`,
  },
  {
    q: "What happens if I pick a version a loader doesn't support?",
    a: "ModHorizon tells you straight away that the pair can't be used, with a Why? button that explains the reason, such as Fabric starting at 1.14 or NeoForge splitting from Forge at 1.20.1. It also suggests the closest version or a loader that does work.",
  },
  {
    q: "Do I get a .jar I can install?",
    a: "When a build service is connected, sources are compiled in an isolated worker with the right Java version for your target, and the .jar is ready to download. Without one you still get the full source preview, but no compiled file.",
  },
  {
    q: "What happens when a build fails?",
    a: "Compiler errors go back to the model for up to three repair attempts. Every revision is validated again before the next build, and the full log stays visible.",
  },
  {
    q: "Is generated code safe to run?",
    a: "Treat it like any third-party plugin or mod: it runs with full access to your server or game. ModHorizon only accepts Java sources and recognised descriptors, rejects build scripts and unexpected paths, and you can read every line before installing.",
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
      <Blocks size={20} strokeWidth={1.8} aria-hidden="true" />
      <span>ModHorizon</span>
    </Link>
  );
}

function SectionHeading({ title, sub, badge }: { title: string; sub?: string; badge?: string }) {
  return (
    <div className="section-head">
      {badge && <span className="section-badge">{badge}</span>}
      <h2 className="section-heading">{title}</h2>
      {sub && <p className="section-subheading">{sub}</p>}
    </div>
  );
}

export default function Landing() {
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <Logo />
          <nav aria-label="Primary">
            <a className="nav-link" href="#features">Features</a>
            <a className="nav-link" href="#versions">Versions</a>
            <a className="nav-link" href="#examples">Examples</a>
            <Link className="nav-link" href="/pricing">Pricing</Link>
            <Link className="nav-link" href="/account">Account</Link>
            <a className="nav-link" href="#faq">FAQ</a>
          </nav>
          <Link href="/create" className="nav-cta">Start building <ArrowRight size={15} aria-hidden="true" /></Link>
        </div>
      </header>

      <main>
        <Hero stats={stats} />

        <section id="create" className="lp-section">
          <SectionHeading
            title="Make every kind of Minecraft content"
            sub="Plugins, mods, shaders, texture packs and datapacks, with the loaders each one runs on."
          />
          <ContentSlider />
        </section>

        <section id="features" className="lp-section">
          <SectionHeading
            title="Everything between an idea and a .jar"
            sub="One workspace for writing, reviewing, building and testing plugins and mods."
          />
          <div className="bento-grid">
            <article className="bento-card bento-large">
              <span className="bento-badge">Core feature</span>
              <Sparkles className="bento-icon" aria-hidden="true" />
              <h3 className="bento-title">Describe it. Build it. Ship it.</h3>
              <p className="bento-description">Write what should happen in game. ModHorizon returns a complete project for your loader: main class, listeners or registries, and the right descriptor.</p>
              <div className="mock mock-composer" aria-hidden="true">
                <p>Add ruby ore, a ruby ingot and a ruby sword stronger than iron<span className="mock-caret" /></p>
                <div className="mock-bar">
                  <span>Fabric</span><span>1.21.11</span><span>Claude Opus 5.5</span>
                  <span className="mock-go">Generate <ArrowRight size={13} aria-hidden="true" /></span>
                </div>
              </div>
            </article>

            <article className="bento-card">
              <span className="bento-badge bento-badge-green">All loaders</span>
              <Layers className="bento-icon" aria-hidden="true" />
              <h3 className="bento-title">Every loader</h3>
              <p className="bento-description">Plugins, proxies and mods from one prompt bar.</p>
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
              <span className="bento-badge">Isolated</span>
              <Wrench className="bento-icon" aria-hidden="true" />
              <h3 className="bento-title">Builds that fix themselves</h3>
              <p className="bento-description">Compiled away from your server with the right JDK, then repaired automatically.</p>
              <div className="mock mock-log" aria-hidden="true">
                <code><span className="dim">01</span> Validating 6 source files</code>
                <code><span className="dim">02</span> Fabric 1.21.11 · Java 21 · mojang</code>
                <code className="warn"><span className="dim">03</span> 1 error · repair 1 of 3</code>
                <code className="ok"><span className="dim">04</span> BUILD SUCCESSFUL · rubygear.jar</code>
              </div>
            </article>

            <article className="bento-card bento-large">
              <span className="bento-badge">Transparent</span>
              <Code2 className="bento-icon" aria-hidden="true" />
              <h3 className="bento-title">Read every line before it runs</h3>
              <p className="bento-description">Browse the generated files like a project in your editor. Nothing is hidden behind a download button.</p>
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
                <h4 className="bento-title-small">Right Java, every time</h4>
                <p className="bento-description-small">Java 8 to 25, matched to the version.</p>
              </div>
              <div className="bento-small">
                <MessageSquareText aria-hidden="true" />
                <h4 className="bento-title-small">Follow-up edits</h4>
                <p className="bento-description-small">Ask for changes in the same chat.</p>
              </div>
              <div className="bento-small">
                <ShieldCheck aria-hidden="true" />
                <h4 className="bento-title-small">Validated output</h4>
                <p className="bento-description-small">No build scripts, binaries or stray paths.</p>
              </div>
              <div className="bento-small">
                <Play aria-hidden="true" />
                <h4 className="bento-title-small">Guided playtest</h4>
                <p className="bento-description-small">Server, proxy or client, step by step.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="lp-section">
          <SectionHeading title="See it build" sub="From a sentence to a working project in the workspace." />
          <div className="showcase">
            <div className="video-container">
              <div className="video-placeholder" aria-hidden="true">
                <Plus size={20} />
                <span>What will you create?</span>
              </div>
              <VideoSlot src={SITE_MEDIA.demo} className="showcase-video" />
            </div>
          </div>
        </section>

        <section id="versions" className="lp-section">
          <SectionHeading
            badge="Every version"
            title="Any loader. Any version it ever shipped."
            sub="Pick a pair and see if it works. If it doesn't, you'll know why."
          />
          <VersionChecker />
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

        <section id="examples" className="lp-section">
          <SectionHeading title="Build anything you imagine" sub="Each example opens in the workspace, ready to edit." />
          <UseCaseTabs />
        </section>

        <section id="faq" className="lp-section faq-section">
          <SectionHeading title="Questions, answered" />
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
              <h2 className="cta-heading">Ready to build something?</h2>
              <p className="cta-subheading">Your next plugin or mod is one sentence away.</p>
              <div className="cta-actions">
                <Link href="/create" className="btn-cta-primary">
                  Start building now <ArrowRight size={18} aria-hidden="true" />
                </Link>
                <a href="#versions" className="btn-cta-secondary"><ListChecks size={18} aria-hidden="true" /> Check a version</a>
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
