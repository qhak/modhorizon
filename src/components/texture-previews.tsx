"use client";

import type { GeneratedFile } from "@/lib/types";
import { isItemRecolorPath, renderItemRecolor } from "@/lib/item-textures";

/** Uses the exact PNG renderer used by ZIP packaging, including on saved projects. */
export function TexturePreviews({ files }: { files: GeneratedFile[] }) {
  const textures = files.filter(file => isItemRecolorPath(file.path)).map(file => {
    try {
      const image = renderItemRecolor(file.path, file.content);
      return { path: image.path, url: `data:image/png;base64,${btoa(String.fromCharCode(...image.bytes))}` };
    } catch { return null; }
  }).filter(texture => texture !== null);
  if (!textures.length) return null;
  return <section aria-label="Generated texture previews" style={{ padding: "16px", borderBottom: "1px solid var(--border, #293044)" }}>
    <h3 style={{ margin: "0 0 6px", fontSize: "14px" }}>Generated textures</h3>
    <p style={{ margin: "0 0 12px", fontSize: "12px", opacity: .75 }}>These are the PNGs included in your ZIP. Shapes and transparency follow the vanilla items. Check their appearance in Minecraft.</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "16px" }}>{textures.map(texture => {
      const label = texture.path.split("/").pop()!.replace(".png", "").replaceAll("_", " ");
      return <figure key={texture.path} style={{ margin: 0, textAlign: "center", maxWidth: "112px" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={texture.url} alt={label} width={80} height={80} style={{ imageRendering: "pixelated", borderRadius: "6px", background: "repeating-conic-gradient(#283040 0% 25%, #1a2130 0% 50%) 0 / 16px 16px" }} />
        <figcaption style={{ fontSize: "11px", marginTop: "5px", textTransform: "capitalize" }}>{label}</figcaption>
      </figure>;
    })}</div>
  </section>;
}
