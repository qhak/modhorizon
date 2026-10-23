// Media on the landing page. Files live in public/; a missing file leaves the
// slot's fallback visible instead of a broken frame.
export const SITE_MEDIA = {
  heroVideo: "/media/hero.mp4",
  heroPoster: "/media/hero-poster.jpg",
  cta: "/media/hero.mp4",
  // Real screenshots from Wikimedia Commons and Modrinth; credits are shown on each card
  // and listed in public/media/types/CREDITS.md.
  types: {
    plugins: {
      src: "/media/types/plugins-screenshot.webp",
      alt: "Snow-covered Minecraft mountains and spruce trees beneath a blue sky",
      author: "Xbox México",
      license: "CC BY 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
      source: "https://commons.wikimedia.org/wiki/File:Minecraft_-_1.18_mountains.jpg",
    },
    mods: {
      src: "/media/types/mods.jpg",
      alt: "The Galacticraft moon buggy parked on the Moon",
      author: "Team Galacticraft",
      license: "MIT",
      licenseUrl: "https://opensource.org/licenses/MIT",
      source: "https://commons.wikimedia.org/wiki/File:Galacticraft_moon_buggy.png",
    },
    shaders: {
      src: "/media/types/shaders-screenshot.webp",
      alt: "A Minecraft beach with clear shader-lit water beneath tall stone cliffs",
      author: "GAMING_SHORTS(RAMA)",
      license: "CC BY 4.0",
      licenseUrl: "https://creativecommons.org/licenses/by/4.0/",
      source: "https://modrinth.com/resourcepack/beach-landscape-panorama-with-shaders/gallery",
    },
    texturePacks: {
      src: "/media/types/textures-screenshot.webp",
      alt: "Minecraft lush cave blocks with moss, vines and glowing berries",
      author: "Xbox México",
      license: "CC BY 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
      source: "https://commons.wikimedia.org/wiki/File:Minecraft_-_Lush_caves.jpg",
    },
    datapacks: {
      src: "/media/types/datapacks.jpg",
      alt: "Lava falls in a Nether cavern",
      author: "Xbox México",
      license: "CC BY 3.0",
      licenseUrl: "https://creativecommons.org/licenses/by/3.0/",
      source: "https://commons.wikimedia.org/wiki/File:Screenshot_from_the_Minecraft_Nether.png",
    },
  },
} as const;

export type SiteImage = (typeof SITE_MEDIA.types)[keyof typeof SITE_MEDIA.types];
