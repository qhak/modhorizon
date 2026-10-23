"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Blocks, Database, Eclipse, Paintbrush2, Search, Server, X } from "lucide-react";
import { CREATION_EXAMPLES, EXAMPLE_CATEGORIES, exampleHref } from "@/lib/creation-examples";
import type { ArtifactType } from "@/lib/types";

const icons = { plugin: Server, mod: Blocks, datapack: Database, resource_pack: Paintbrush2, shader_pack: Eclipse };

export function ExampleLibrary() {
  const [category, setCategory] = useState<ArtifactType | "all">("all");
  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState(false);
  const term = query.trim().toLowerCase();
  const filtered = CREATION_EXAMPLES.filter(example => (category === "all" || example.type === category) && `${example.title} ${example.prompt} ${example.target} ${example.version}`.toLowerCase().includes(term));
  const visible = expanded ? filtered : filtered.slice(0, 6);

  return (
    <div className="example-library">
      <div className="example-controls">
        <div className="example-filters" role="group" aria-label="Filter example types">
          <button type="button" aria-pressed={category === "all"} onClick={() => { setCategory("all"); setExpanded(false); }}>All ideas <span>{CREATION_EXAMPLES.length}</span></button>
          {EXAMPLE_CATEGORIES.map(({ id, label }) => <button key={id} type="button" aria-pressed={category === id} onClick={() => { setCategory(id); setExpanded(false); }}>{label}</button>)}
        </div>
        <div className="example-search"><Search size={17} aria-hidden="true" /><label className="sr-only" htmlFor="example-search">Search example prompts</label><input id="example-search" type="search" value={query} placeholder="Search ideas, loaders or versions…" onChange={event => { setQuery(event.target.value); setExpanded(false); }} />{query && <button type="button" aria-label="Clear search" onClick={() => setQuery("")}><X size={15} aria-hidden="true" /></button>}</div>
      </div>
      <p className="example-count" role="status">{filtered.length} {filtered.length === 1 ? "idea" : "ideas"}{category === "all" ? " across five creation types" : ` for ${EXAMPLE_CATEGORIES.find(item => item.id === category)?.label.toLowerCase()}`}. Choose one to customize in the workspace.</p>
      <div className="example-grid">
        {visible.map(example => {
          const Icon = icons[example.type];
          return <Link key={example.title} href={exampleHref(example)} className={`example-card example-${example.type}`}>
            <div className="example-card-top"><span className="example-card-icon"><Icon size={20} aria-hidden="true" /></span><span>{example.target === "vanilla" ? EXAMPLE_CATEGORIES.find(item => item.id === example.type)?.label : example.target} · {example.version}</span><ArrowUpRight size={17} aria-hidden="true" /></div>
            <h3>{example.title}</h3><p>{example.prompt}</p><span className="example-card-action">Use this idea <ArrowUpRight size={14} aria-hidden="true" /></span>
          </Link>;
        })}
      </div>
      {filtered.length === 0 && <div className="example-empty"><Search size={25} aria-hidden="true" /><h3>No matching ideas yet.</h3><p>Try “recipe”, “welcome”, “Fabric” or another version.</p><button type="button" onClick={() => { setQuery(""); setCategory("all"); }}>Reset filters</button></div>}
      {filtered.length > 6 && <button type="button" className="example-more" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "Show fewer ideas" : `Explore all ${filtered.length} ideas`}</button>}
    </div>
  );
}
