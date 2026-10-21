// Media on the landing page. Files live in public/; a missing file leaves the
// slot's fallback visible instead of a broken frame.
export const SITE_MEDIA = {
  heroVideo: "/media/hero.mp4",
  heroPoster: "/media/hero-poster.jpg",
  demo: "/media/demo.mp4",
  cta: "/media/hero.mp4",
  // Openly licensed images from Wikimedia Commons; credits are shown on each card
  // and listed in public/media/types/CREDITS.md.
  types: {
    plugins: {
      src: "/media/types/plugins.jpg",
      alt: "A creeper approaching a torch-lit camp at night",
      author: "LorenzoF06",
      license: "CC BY-SA 4.0",
      source: "https://commons.wikimedia.org/wiki/File:Minecraft_Creeper.jpg",
    },
    mods: {
      src: "/media/types/mods.jpg",
      alt: "The Galacticraft moon buggy parked on the Moon",
      author: "Team Galacticraft",
      license: "MIT",
      source: "https://commons.wikimedia.org/wiki/File:Galacticraft_moon_buggy.png",
    },
    shaders: {
      src: "/media/types/shaders.jpg",
      alt: "A shader-lit sunset over an obsidian bridge and calm water",
      author: "KittyKot",
      license: "CC BY-SA 4.0",
      source: "https://commons.wikimedia.org/wiki/File:Diagonal_obsidian_bridge_over_water.png",
    },
    texturePacks: {
      src: "/media/types/texture-packs.jpg",
      alt: "Detailed block textures on a Tinkers' Construct smeltery",
      author: "Amberrock; textures by mDiyo and KnightMiner",
      license: "MIT",
      source: "https://commons.wikimedia.org/wiki/File:Tinkers_Construct_smeltery.png",
    },
    datapacks: {
      src: "/media/types/datapacks.jpg",
      alt: "Lava falls in a Nether cavern",
      author: "Xbox México",
      license: "CC BY 3.0",
      source: "https://commons.wikimedia.org/wiki/File:Screenshot_from_the_Minecraft_Nether.png",
    },
  },
} as const;

export type SiteImage = (typeof SITE_MEDIA.types)[keyof typeof SITE_MEDIA.types];
