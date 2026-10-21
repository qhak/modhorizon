"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Blocks, History, Network, Puzzle, type LucideIcon } from "lucide-react";
import { PLATFORMS, type PlatformId } from "@/lib/platforms";

const useCases: { id: string; label: string; icon: LucideIcon; title: string; examples: { prompt: string; platform: PlatformId; version?: string }[] }[] = [
  {
    id: "plugins",
    label: "Plugins",
    icon: Puzzle,
    title: "Server plugins",
    examples: [
      { platform: "paper", prompt: "Give players Speed II for 10 seconds whenever they kill a zombie." },
      { platform: "paper", prompt: "A /heal command with a 60 second cooldown and a heal permission." },
      { platform: "spigot", prompt: "A /warps menu that lists warps from config.yml as clickable items." },
      { platform: "folia", prompt: "Welcome first-time players with a title and a starter kit." },
    ],
  },
  {
    id: "mods",
    label: "Mods",
    icon: Blocks,
    title: "Client and server mods",
    examples: [
      { platform: "fabric", prompt: "Add ruby ore, a ruby ingot smelted from it, and a ruby sword stronger than iron." },
      { platform: "neoforge", prompt: "A totem that saves your inventory when you die in the void." },
      { platform: "forge", prompt: "A backpack item that opens a 27-slot inventory and keeps its contents." },
      { platform: "quilt", prompt: "Make crops grow twice as fast when it is raining." },
    ],
  },
  {
    id: "proxies",
    label: "Proxies",
    icon: Network,
    title: "Network plugins",
    examples: [
      { platform: "velocity", prompt: "A /lobby command that sends players to a server named lobby." },
      { platform: "velocity", prompt: "Show a configurable MOTD with the current online player count." },
      { platform: "bungeecord", prompt: "Broadcast a staff message to every server with /alert." },
    ],
  },
  {
    id: "legacy",
    label: "Legacy",
    icon: History,
    title: "Older versions",
    examples: [
      { platform: "forge", version: "1.12.2", prompt: "A mod that adds an ender pearl launcher item." },
      { platform: "spigot", version: "1.8.8", prompt: "A kit PvP plugin with a /kit command and three kits." },
      { platform: "forge", version: "1.7.10", prompt: "A mod that adds an obsidian pickaxe." },
    ],
  },
];

export function UseCaseTabs() {
  const [active, setActive] = useState(useCases[0].id);
  const current = useCases.find((useCase) => useCase.id === active) ?? useCases[0];

  return (
    <div className="usecases">
      <div className="usecase-tabs" role="tablist" aria-label="Example categories">
        {useCases.map((useCase) => (
          <button
            key={useCase.id}
            role="tab"
            id={`usecase-tab-${useCase.id}`}
            aria-selected={active === useCase.id}
            aria-controls="usecase-panel"
            className={active === useCase.id ? "active" : ""}
            onClick={() => setActive(useCase.id)}
          >
            <useCase.icon size={16} aria-hidden="true" />
            {useCase.label}
          </button>
        ))}
      </div>
      <div className="usecase-panel" id="usecase-panel" role="tabpanel" aria-labelledby={`usecase-tab-${current.id}`}>
        <h3>{current.title}</h3>
        <ul>
          {current.examples.map(({ prompt, platform, version }) => (
            <li key={prompt}>
              <Link href={`/create?platform=${platform}${version ? `&version=${version}` : ""}&prompt=${encodeURIComponent(prompt)}`}>
                <span className="usecase-loader">{PLATFORMS[platform].label}{version ? ` ${version}` : ""}</span>
                <span className="usecase-prompt">{prompt}</span>
                <ArrowUpRight size={16} aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
