"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, ChevronDown, TriangleAlert } from "lucide-react";
import {
  MINECRAFT_RELEASES,
  PLATFORMS,
  PLATFORM_GROUPS,
  incompatibility,
  isPlatformId,
  javaVersionFor,
  type PlatformId,
} from "@/lib/platforms";

/** Lets visitors check a loader and Minecraft version pair before opening the workspace. */
export function VersionChecker() {
  const [platform, setPlatform] = useState<PlatformId>("fabric");
  const [version, setVersion] = useState("1.12.2");
  const [explained, setExplained] = useState(false);
  const loaders = PLATFORM_GROUPS.filter((group) => group.kind !== "proxy");
  const problem = incompatibility(platform, version);

  return (
    <div className="checker">
      <div className="checker-controls">
        <label>
          <span>Loader</span>
          <select value={platform} onChange={(event) => { if (isPlatformId(event.target.value)) setPlatform(event.target.value); setExplained(false); }}>
            {loaders.map((group) => (
              <optgroup key={group.kind} label={group.label}>
                {group.ids.map((id) => <option key={id} value={id}>{PLATFORMS[id].label}</option>)}
              </optgroup>
            ))}
          </select>
          <ChevronDown size={14} aria-hidden="true" />
        </label>
        <label>
          <span>Minecraft</span>
          <select value={version} onChange={(event) => { setVersion(event.target.value); setExplained(false); }}>
            {MINECRAFT_RELEASES.map((release) => <option key={release} value={release}>{release}</option>)}
          </select>
          <ChevronDown size={14} aria-hidden="true" />
        </label>
      </div>

      <div className={`checker-result ${problem ? "is-blocked" : "is-ok"}`} role="status">
        {problem ? (
          <>
            <div className="checker-head">
              <TriangleAlert size={16} aria-hidden="true" />
              <strong>{problem.title}</strong>
              <button type="button" aria-expanded={explained} onClick={() => setExplained((open) => !open)}>
                {explained ? "Hide" : "Why?"}
              </button>
            </div>
            {explained && <p>{problem.reason}</p>}
            {(problem.nearest || problem.alternatives.length > 0) && (
              <div className="checker-options">
                {problem.nearest && <button type="button" onClick={() => setVersion(problem.nearest!)}>Try {PLATFORMS[platform].label} {problem.nearest}</button>}
                {problem.alternatives.slice(0, 3).map((id) => (
                  <button type="button" key={id} onClick={() => setPlatform(id)}>Try {PLATFORMS[id].label}</button>
                ))}
              </div>
            )}
          </>
        ) : (
          <div className="checker-head">
            <Check size={16} aria-hidden="true" />
            <strong>{PLATFORMS[platform].label} supports Minecraft {version}. Builds target Java {javaVersionFor(platform, version)}.</strong>
            <Link href={`/create?platform=${platform}&version=${version}`}>Start</Link>
          </div>
        )}
      </div>
    </div>
  );
}
