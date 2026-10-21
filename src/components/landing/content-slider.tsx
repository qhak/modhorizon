"use client";

import { useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Blocks, Database, FileCode2, Layers, Palette, Puzzle, Sun, type LucideIcon } from "lucide-react";
import { PLATFORMS, PLATFORM_GROUPS, compareVersions } from "@/lib/platforms";

type Loader = { label: string; note?: string };
type ContentType = {
  id: string;
  title: string;
  icon: LucideIcon;
  summary: string;
  available: boolean;
  loaders: Loader[];
  versions: string;
  files: string;
  visual: ReactNode;
  href?: string;
};

function rangeOf(kind: "plugin" | "mod") {
  const versions = PLATFORM_GROUPS.find((group) => group.kind === kind)!.ids.flatMap((id) => PLATFORMS[id].versions);
  const sorted = [...versions].sort(compareVersions);
  return `${sorted[0]} – ${sorted.at(-1)}`;
}

const loadersOf = (kind: "plugin" | "proxy" | "mod", note?: string): Loader[] =>
  PLATFORM_GROUPS.find((group) => group.kind === kind)!.ids.map((id) => ({ label: PLATFORMS[id].label, note }));

// Pixel colours for a 6×6 grass-block texture in the resource-pack card.
const GRASS = "001011010010110110101001100110010100".split("").map(Number);

const contentTypes: ContentType[] = [
  {
    id: "plugins",
    title: "Plugins",
    icon: Puzzle,
    summary: "Commands, events, menus and gameplay rules for servers and networks.",
    available: true,
    loaders: [...loadersOf("plugin"), ...loadersOf("proxy", "proxy")],
    versions: rangeOf("plugin"),
    files: "Java · plugin.yml, bungee.yml or velocity-plugin.json",
    href: "/create?platform=paper",
    visual: (
      <div className="slide-art art-terminal">
        <code><span>&gt;</span> /heal Steve</code>
        <code className="ok">Healed Steve to full health.</code>
        <code><span>&gt;</span> /warps</code>
      </div>
    ),
  },
  {
    id: "mods",
    title: "Mods",
    icon: Blocks,
    summary: "New items, blocks, mobs and mechanics for clients and servers.",
    available: true,
    loaders: loadersOf("mod"),
    versions: rangeOf("mod"),
    files: "Java · fabric.mod.json, quilt.mod.json or mods.toml",
    href: "/create?platform=fabric",
    visual: (
      <div className="slide-art art-inventory">
        {["ruby", "ingot", "", "sword", "", "ore", "", "", "gem"].map((item, index) => (
          <span key={index} className={item ? `slot slot-${item}` : "slot"} />
        ))}
      </div>
    ),
  },
  {
    id: "shaders",
    title: "Shaders",
    icon: Sun,
    summary: "Lighting, shadows, water and sky effects as a shader pack.",
    available: false,
    loaders: [
      { label: "Iris", note: "Fabric, Quilt, NeoForge" },
      { label: "Oculus", note: "Forge" },
      { label: "OptiFine" },
    ],
    versions: "Depends on the shader loader",
    files: "GLSL · shaders.properties",
    visual: <div className="slide-art art-sky"><span className="sun" /></div>,
  },
  {
    id: "resource-packs",
    title: "Texture packs",
    icon: Palette,
    summary: "Block and item textures, models, sounds and fonts as a resource pack.",
    available: false,
    loaders: [
      { label: "Vanilla", note: "no loader needed" },
      { label: "OptiFine", note: "connected textures" },
      { label: "Continuity", note: "Fabric" },
    ],
    versions: "1.6.1 – 26.3 as resource packs",
    files: "pack.mcmeta · PNG textures · JSON models",
    visual: (
      <div className="slide-art art-texture">
        {GRASS.map((shade, index) => <span key={index} className={shade ? "px-light" : "px-dark"} />)}
      </div>
    ),
  },
  {
    id: "datapacks",
    title: "Datapacks",
    icon: Database,
    summary: "Recipes, advancements, loot tables and functions without any mods.",
    available: false,
    loaders: [
      { label: "Vanilla", note: "any server" },
      { label: "Paper" },
      { label: "Fabric" },
      { label: "Forge" },
      { label: "NeoForge" },
    ],
    versions: "1.13 – 26.3",
    files: "pack.mcmeta · .mcfunction · JSON",
    visual: (
      <div className="slide-art art-terminal">
        <code><span>#</span> tick.mcfunction</code>
        <code>execute as @a at @s</code>
        <code>  run particle flame ~ ~ ~</code>
      </div>
    ),
  },
];

export function ContentSlider() {
  const track = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function goTo(index: number) {
    const element = track.current;
    const slide = element?.children[index] as HTMLElement | undefined;
    if (!element || !slide) return;
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    element.scrollTo({ left: slide.offsetLeft - element.offsetLeft, behavior: smooth ? "smooth" : "auto" });
  }

  function onScroll() {
    const element = track.current;
    if (!element) return;
    const slides = Array.from(element.children) as HTMLElement[];
    const position = element.scrollLeft + element.offsetLeft;
    let nearest = 0;
    slides.forEach((slide, index) => {
      if (Math.abs(slide.offsetLeft - position) < Math.abs(slides[nearest].offsetLeft - position)) nearest = index;
    });
    // At the far end the last slides can't reach the left edge, so treat the end as the last slide.
    if (element.scrollLeft + element.clientWidth >= element.scrollWidth - 4) nearest = slides.length - 1;
    setActive(nearest);
  }

  return (
    <div className="slider" role="region" aria-roledescription="carousel" aria-label="What you can make">
      <div className="slider-track" ref={track} onScroll={onScroll}>
        {contentTypes.map((type, index) => (
          <article
            key={type.id}
            className="slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${index + 1} of ${contentTypes.length}: ${type.title}`}
          >
            {type.visual}
            <div className="slide-body">
              <div className="slide-head">
                <span className="slide-icon" aria-hidden="true"><type.icon size={18} /></span>
                <h3>{type.title}</h3>
                <span className={`slide-status ${type.available ? "is-available" : ""}`}>
                  {type.available ? "Available" : "Coming soon"}
                </span>
              </div>
              <p>{type.summary}</p>
              <div className="slide-loaders" aria-label={`${type.title} loaders`}>
                {type.loaders.map((loader) => (
                  <span key={loader.label + (loader.note ?? "")}>
                    {loader.label}
                    {loader.note && <small>{loader.note}</small>}
                  </span>
                ))}
              </div>
              <dl className="slide-meta">
                <div><dt><Layers size={13} aria-hidden="true" /> Versions</dt><dd>{type.versions}</dd></div>
                <div><dt><FileCode2 size={13} aria-hidden="true" /> Files</dt><dd>{type.files}</dd></div>
              </dl>
              {type.href && (
                <Link href={type.href} className="slide-link">
                  Build {type.title.toLowerCase()} <ArrowRight size={15} aria-hidden="true" />
                </Link>
              )}
            </div>
          </article>
        ))}
      </div>
      <div className="slider-controls">
        <div className="slider-dots">
          {contentTypes.map((type, index) => (
            <button
              key={type.id}
              type="button"
              className={index === active ? "active" : ""}
              aria-label={`Show ${type.title}`}
              aria-current={index === active}
              onClick={() => goTo(index)}
            />
          ))}
        </div>
        <div className="slider-arrows">
          <button type="button" aria-label="Previous" disabled={active === 0} onClick={() => goTo(active - 1)}>
            <ArrowLeft size={18} aria-hidden="true" />
          </button>
          <button type="button" aria-label="Next" disabled={active === contentTypes.length - 1} onClick={() => goTo(active + 1)}>
            <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
