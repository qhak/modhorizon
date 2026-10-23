"use client";

import { useEffect, useState, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowRight, CalendarRange, Gamepad2, Layers } from "lucide-react";
import { SITE_MEDIA } from "@/lib/site-media";
import { VideoSlot } from "./media-slot";

const WORDS = ["plugins", "mods", "shaders", "resource packs"] as const;

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
  const typed = useTypewriter(WORDS);

  return (
    <section className="hero-section">
      <div className="hero-backdrop" style={{ "--poster": `url(${SITE_MEDIA.heroPoster})` } as CSSProperties}>
        <VideoSlot src={SITE_MEDIA.heroVideo} className="hero-video" pausable />
        <div className="video-gradient" aria-hidden="true" />
      </div>

      <div className="hero-wrapper">
        <div className="hero-inner">
          <h1 className="hero-title">
            Minecraft{" "}
            <span className="word-typewriter" aria-hidden="true">
              <span className="typed-word">{typed}</span>
              <span className="cursor" />
            </span>
            <span className="sr-only">plugins, mods, shaders and resource packs</span>
            <span className="hero-title-rest">from a prompt.</span>
          </h1>

          <p className="hero-tagline">
            Pick a loader and a version, describe what you want, and read every file before you download it.
          </p>

          <div className="hero-cta">
            <Link href="/create" className="btn-primary-hero">
              Start creating <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <a href="#versions" className="btn-ghost-hero"><Layers size={17} aria-hidden="true" /> Supported versions</a>
          </div>

          <ul className="hero-facts">
            {stats.map((stat) => {
              const Icon = STAT_ICONS[stat.icon];
              return (
                <li key={stat.label}>
                  <Icon size={15} aria-hidden="true" /> <strong>{stat.value}</strong> {stat.label}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </section>
  );
}
