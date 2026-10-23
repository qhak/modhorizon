import Link from "next/link";
import { ArrowDownToLine, ArrowUpRight, Database, Eclipse, Paintbrush2, Server, Sword, type LucideIcon } from "lucide-react";
import { SITE_MEDIA, type SiteImage } from "@/lib/site-media";

type Category = {
  id: string;
  title: string;
  icon: LucideIcon;
  image: SiteImage;
  summary: string;
  prompt: string;
  href: string;
};

const categories: Category[] = [
  {
    id: "datapacks", title: "Datapacks", icon: Database, image: SITE_MEDIA.types.datapacks,
    summary: "Recipes, loot tables and functions for your world. No mod loader needed.",
    prompt: "Create a Minecraft Java datapack with a manual welcome:hello function that shows the player a colorful welcome message. Include installation steps.",
    href: "/create?type=datapack&version=1.21.4",
  },
  {
    id: "plugins", title: "Server plugins", icon: Server, image: SITE_MEDIA.types.plugins,
    summary: "Commands, custom menus and new rules for your server.",
    prompt: "A /spawn command with a configurable welcome message.",
    href: "/create?platform=paper",
  },
  {
    id: "mods", title: "Minecraft mods", icon: Sword, image: SITE_MEDIA.types.mods,
    summary: "New items, blocks and mechanics to change how you play.",
    prompt: "Add ruby ore, a ruby ingot and a sword stronger than iron.",
    href: "/create?platform=fabric",
  },
  {
    id: "shaders", title: "Shader packs", icon: Eclipse, image: SITE_MEDIA.types.shaders,
    summary: "Explore lighting, sky and water effects through shader code.",
    prompt: "A lightweight Iris shader with warm sunset colors.",
    href: "/create?type=shader_pack",
  },
  {
    id: "textures", title: "Resource packs", icon: Paintbrush2, image: SITE_MEDIA.types.texturePacks,
    summary: "Customize item names and pack metadata. Texture generation is not available yet.",
    prompt: "Rename the diamond sword to Nightfall Blade in English.",
    href: "/create?type=resource_pack",
  },
];

/** All supported creation types stay visible, without a carousel or repeated loader lists. */
export function ContentGallery() {
  return (
    <div className="creation-grid">
      {categories.map(({ id, title, icon: Icon, image, summary, prompt, href }) => (
        <article key={id} className={`creation-card creation-${id}`}>
          <figure className="creation-art">
            {/* Precompressed local assets also work in the standalone HTML preview. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.src} alt={image.alt} width={1000} height={600} loading="lazy" decoding="async" />
            <figcaption>
              <a href={image.source} target="_blank" rel="noreferrer">{image.author}</a>
              <a href={image.licenseUrl} target="_blank" rel="noreferrer">{image.license}</a>
            </figcaption>
          </figure>
          <div className="creation-body">
            <div className="creation-title"><span className="creation-icon"><Icon size={23} strokeWidth={1.7} aria-hidden="true" /></span><h3>{title}</h3></div>
            <p>{summary}</p>
            <Link href={`${href}&prompt=${encodeURIComponent(prompt)}`} className="creation-prompt">
              <span><small>TRY AN IDEA</small>{prompt}</span><ArrowUpRight size={19} aria-hidden="true" />
              <span className="sr-only"> Create {title.toLowerCase()}</span>
            </Link>
            {id === "datapacks" && <Link className="sample-download" href="/api/examples/datapack?version=1.21.4" prefetch={false} download><ArrowDownToLine size={15} aria-hidden="true" /><span>Download a sample <small>Java 1.21.4 · no credits needed</small></span></Link>}
          </div>
        </article>
      ))}
    </div>
  );
}
