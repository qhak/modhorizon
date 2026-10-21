"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, Blocks, CalendarRange, Gamepad2, Layers, Puzzle, Sparkles } from "lucide-react";
import { SITE_MEDIA } from "@/lib/site-media";
import { VideoSlot } from "./media-slot";

const modes = {
  plugins: { label: "Plugins", icon: Puzzle, words: ["plugins", "minigames", "commands"], href: "/create?platform=paper" },
  mods: { label: "Mods", icon: Blocks, words: ["mods", "items", "mobs"], href: "/create?platform=fabric" },
} as const;
type Mode = keyof typeof modes;

/** Types, holds, deletes and cycles through words; static under reduced motion. */
function useTypewriter(words: readonly string[]) {
  const [text, setText] = useState(words[0]);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setText(words[0]);
      return;
    }
    let word = 0;
    let length = words[0].length;
    let deleting = false;
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = words[word];
      if (!deleting && length === current.length) {
        deleting = true;
        timer = setTimeout(tick, 2200);
        return;
      }
      if (deleting && length === 0) {
        deleting = false;
        word = (word + 1) % words.length;
      }
      length += deleting ? -1 : 1;
      setText(words[word].slice(0, length));
      timer = setTimeout(tick, deleting ? 45 : 90);
    };
    timer = setTimeout(tick, 2200);
    return () => clearTimeout(timer);
  }, [words]);
  return text;
}

const STAT_ICONS = { releases: Gamepad2, loaders: Layers, range: CalendarRange };

export function Hero({ stats }: { stats: { value: string; label: string; icon: keyof typeof STAT_ICONS }[] }) {
  const [mode, setMode] = useState<Mode>("plugins");
  const typed = useTypewriter(modes[mode].words);

  return (
    <section className="hero-section">
      <div className="hero-backdrop" style={{ "--poster": `url(${SITE_MEDIA.heroPoster})` } as CSSProperties}>
        <VideoSlot src={SITE_MEDIA.heroVideo} className="hero-video" pausable />
        <div className="video-gradient" aria-hidden="true" />
      </div>

      <div className="hero-wrapper">
        <div className="hero-inner">
          <div className="platform-toggle" role="tablist" aria-label="What do you want to build?">
            {(Object.keys(modes) as Mode[]).map((key) => {
              const Icon = modes[key].icon;
              return (
                <button
                  key={key}
                  role="tab"
                  aria-selected={mode === key}
                  className={`platform-btn ${mode === key ? "active" : ""}`}
                  onClick={() => setMode(key)}
                >
                  <Icon aria-hidden="true" />
                  {modes[key].label}
                </button>
              );
            })}
          </div>

          <h1 className="hero-headline">
            <span className="headline-main">
              <span className="word-static">Build Minecraft</span>{" "}
              <span className="word-typewriter" aria-hidden="true">
                <span className="typed-word">{typed}</span>
                <span className="cursor" />
              </span>
              <span className="sr-only">{modes[mode].words[0]}</span>
            </span>
            <span className="headline-sub">Without writing code</span>
          </h1>

          <p className="hero-tagline">
            Describe it in plain English and get readable Java for any loader, on any supported version.
          </p>

          <div className="hero-cta">
            <Link href={modes[mode].href} className="btn-primary-hero">
              Start building <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a href="#features" className="btn-ghost-hero"><Sparkles size={17} aria-hidden="true" /> See features</a>
          </div>

          <dl className="hero-stats">
            {stats.map((stat) => {
              const Icon = STAT_ICONS[stat.icon];
              return (
              <div key={stat.label}>
                <dt><Icon size={14} aria-hidden="true" /> {stat.label}</dt>
                <dd>{stat.value}</dd>
              </div>
              );
            })}
          </dl>
        </div>
      </div>
    </section>
  );
}
