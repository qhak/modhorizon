import Link from "next/link";
import { ArrowRight, ArrowUpRight, Blocks, Braces, Check, ChevronDown, FileCode2, Folder, GitBranch, Hammer, History, Layers, MessageSquare, Sparkles, Terminal } from "lucide-react";
import { HeroVideo } from "@/components/hero-video";
import { CreditFoundation } from "@/components/credit-foundation";
import "./landing.css";

const capabilities = [
  { icon: Sparkles, title: "An idea is a good starting point.", body: "Describe a Paper plugin in plain English. Generate and refine source with a configured AI provider.", status: "Provider required" },
  { icon: Braces, title: "Keep the code in sight.", body: "Inspect generated Java, resources, and build logs in the existing workspace. A full editing IDE is on the roadmap.", status: "Source preview available" },
  { icon: Hammer, title: "From source to server.", body: "Compile and download a JAR when a trusted build service is connected. No pretend builds or placeholder downloads.", status: "Build service required" },
];
const sample = [
  "package dev.modhorizon.zombiesprint;", "", "import org.bukkit.event.EventHandler;",
  "import org.bukkit.event.entity.EntityDeathEvent;", "", "public final class KillListener implements Listener {",
  "    @EventHandler", "    public void onKill(EntityDeathEvent event) {",
  "        if (!(event.getEntity() instanceof Zombie)) return;",
  "        Player player = event.getEntity().getKiller();", "        if (player == null) return;", "",
  "        player.addPotionEffect(new PotionEffect(", "            PotionEffectType.SPEED, 200, 1));", "    }", "}",
];

export default function Home() {
  return <div className="landing">
    <a className="skip-link" href="#content">Skip to content</a>
    <header className="landing-header"><div className="landing-nav">
      <Link href="/" className="landing-brand" aria-label="ModHorizon home"><Blocks size={24} strokeWidth={1.7} />ModHorizon<span className="brand-beta">PREVIEW</span></Link>
      <nav className="desktop-links" aria-label="Main navigation"><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#pricing">Pricing</a></nav>
      <div className="nav-actions"><a className="sign-in" href="#account">Sign in</a><Link className="landing-button compact" href="/dashboard">Start building <ArrowUpRight size={14} /></Link></div>
      <details className="landing-mobile-menu"><summary>Menu <ChevronDown size={14} /></summary><nav aria-label="Mobile navigation"><a href="#features">Features</a><a href="#how-it-works">How it works</a><a href="#pricing">Pricing</a><a href="#account">Sign in</a></nav></details>
    </div></header>
    <main id="content">
      <section className="cinematic-hero" aria-labelledby="hero-title">
        <div className="hero-media" aria-hidden="true" /><HeroVideo className="hero-film" /><div className="hero-shade" />
        <div className="hero-inner"><div className="hero-eyebrow"><span /> A NEW HORIZON FOR MINECRAFT CREATORS</div>
          <h1 id="hero-title">Your Minecraft ideas.<br /><span>Built with AI.</span></h1>
          <p>Go from “what if” to your next Paper plugin.<br className="desktop-break" /> Describe the idea. Explore the code. Make it yours.</p>
          <div className="hero-actions"><Link href="/dashboard" className="landing-button">Start building <ArrowRight size={16} /></Link><a className="landing-button outlined" href="#how-it-works">See how it works <span aria-hidden="true">↘</span></a></div>
          <div className="hero-platforms"><span>MADE FOR MINECRAFT JAVA</span><span className="platform-separator" /><span>Paper 1.21.x</span><span className="future-platform">Fabric & NeoForge planned</span></div>
        </div>
        <div className="hero-caption"><span>THE POSSIBILITIES ARE WORLD-SIZED.</span><span>Reference gameplay · inspiration, not a ModHorizon-generated mod</span></div>
      </section>

      <section className="landing-section showcase-section" aria-labelledby="workspace-title">
        <div className="section-intro"><div><span className="landing-label">YOUR NEXT WORKSPACE</span><h2 id="workspace-title">One place to bring it together.</h2></div><p>The conversation. The code. The next build.<br />A look at where ModHorizon is headed.</p></div>
        <div className="workspace-demo" role="img" aria-label="Illustrative workspace with a ZombieSprint sample project, AI chat, Java file explorer, Minecraft 1.21.4 selector, build status and disabled JAR download. This is not a live generation.">
          <div className="demo-toolbar"><span><Blocks size={16} /> ModHorizon <span className="demo-slash">/</span> ZombieSprint</span><span className="demo-version">Paper · 1.21.4 <ChevronDown size={12} /></span><span className="demo-badge">ILLUSTRATIVE PREVIEW</span></div>
          <div className="demo-body"><aside className="demo-sidebar"><span className="demo-label">PROJECTS <span>+</span></span><div className="demo-project"><Layers size={14} /> ZombieSprint</div><span className="demo-label file-label">EXPLORER</span><div><Folder size={13} /> src / main</div><div className="file-indent"><Folder size={13} /> java</div><div className="demo-file"><FileCode2 size={13} /> KillListener.java</div><div className="file-indent"><Folder size={13} /> resources</div><div className="file-indent">&nbsp; plugin.yml</div><div className="demo-sidebar-bottom"><GitBranch size={13} /> main <span>Java 21</span></div></aside>
          <div className="demo-chat"><div className="demo-pane-title"><Sparkles size={14} /> AI conversation</div><div className="demo-user">Give players a speed boost when they defeat a zombie.</div><div className="demo-ai"><span className="ai-mark"><Blocks size={15} /> ModHorizon <small>Sample response</small></span><p>A small reward for surviving the night. This example listens for zombie kills and gives the player Speed II for 10 seconds.</p><div className="sample-file"><FileCode2 size={14} /> KillListener.java <Check size={13} /></div><p className="demo-disclaimer">Illustrative content. No generation is running.</p></div><div className="demo-input">Ask a follow-up…<ArrowRight size={14} /></div></div>
          <div className="demo-editor"><div className="demo-pane-title"><FileCode2 size={14} /> KillListener.java <span>Java</span></div><pre>{sample.map((line, i) => <div key={i}><span className="demo-line-number">{i + 1}</span><code className={line.trim().startsWith("import") || line.trim().startsWith("package") ? "code-import" : line.includes("@") ? "code-annotation" : ""}>{line || " "}</code></div>)}</pre><div className="demo-build"><div><Terminal size={13} /> Build output <span>Example only</span></div><p>Source preview · compilation service required</p><button disabled type="button">Download JAR <ArrowUpRight size={12} /></button></div></div></div>
          <div className="demo-status"><span><GitBranch size={12} /> main</span><span>Sample project · preview only</span><span>Paper 1.21.4 · Java 21</span></div>
        </div><div className="showcase-footnote"><span><Terminal size={14} /> Built around the way developers think.</span><Link href="/workspace">Explore the current prototype <ArrowRight size={14} /></Link></div>
      </section>

      <section className="landing-section features-section" id="features"><span className="landing-label">LESS SETUP. MORE POSSIBILITY.</span><h2>For the idea you can’t stop thinking about.</h2><div className="feature-columns">{capabilities.map(({ icon: Icon, title, body, status }) => <article key={title}><Icon size={22} strokeWidth={1.5} /><h3>{title}</h3><p>{body}</p><span className="feature-state">{status}</span></article>)}</div>
        <div className="roadmap-strip"><span className="landing-label">ON THE HORIZON</span><span><Blocks size={15} /> Fabric & NeoForge mods</span><span><Folder size={15} /> Project management</span><span><MessageSquare size={15} /> AI-assisted debugging</span><span><History size={15} /> Project history</span></div>
      </section>

      <section className="landing-section process-section" id="how-it-works"><div className="section-intro"><div><span className="landing-label">THE WORKFLOW</span><h2>Start with a sentence.</h2></div><p>A simple path from an idea to source code.<br />Live generation and builds depend on connected services.</p></div><div className="process-grid">{[
        ["01", "Describe your project.", "A command, a gameplay mechanic, a whole new way to play. Tell ModHorizon what you have in mind."],
        ["02", "Generate. Inspect. Refine.", "Review the Java source. With an AI provider connected, use follow-up prompts to shape the details."],
        ["03", "Build and download.", "Connect a trusted compiler to produce a JAR, then test your plugin on a Minecraft server."],
      ].map(([n, title, body]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>

      <section className="landing-section pricing-section" id="pricing"><div className="pricing-intro"><span className="landing-label">A FAIR START</span><h2>More creating.<br />Less commitment.</h2><p>A credit-based model is planned. Explore the prototype today; accounts, credit purchases, and rewards are not live yet.</p><Link href="/workspace" className="landing-button outlined">Explore the prototype <ArrowUpRight size={15} /></Link></div><div className="rewards-panel"><div className="rewards-header"><h3>Make room for your first idea.</h3><span>REWARDS PREVIEW</span></div><CreditFoundation /><p className="rewards-note">Proposed rewards, not an available balance. Referral bonuses require server verification. Paid pricing will be announced when available.</p></div></section>
      <section className="landing-section account-section" id="account"><span className="landing-label">ACCOUNT ACCESS</span><h3>Your workspace is open to explore.</h3><p>Sign-in and account balances are planned. The current prototype works without an account and keeps recent source projects in this browser.</p><Link href="/workspace">Open workspace <ArrowRight size={14} /></Link></section>
      <section className="final-cta"><span className="landing-label">MAKE SOMETHING WORTH PLAYING.</span><h2>Ready to build your first<br />Minecraft project?</h2><Link className="landing-button" href="/dashboard">Start building <ArrowRight size={16} /></Link><p>Paper plugins today. A bigger horizon ahead.</p></section>
    </main><footer className="landing-footer"><Link className="landing-brand" href="/"><Blocks size={20} />ModHorizon</Link><span>Independent project. Not affiliated with Mojang or Microsoft.</span><span>© {new Date().getFullYear()} ModHorizon</span></footer>
  </div>;
}
