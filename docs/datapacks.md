# Datapacks

Choose **Datapack** in `/create`, or open a datapack example in the homepage's
searchable inspiration library. Target vanilla Minecraft Java and choose a
release from 1.13 onward. A configured AI provider and the usual account/credit
checks are required to generate a custom project. No Java build worker is needed.

The ZIP contains root `pack.mcmeta` and text files under `data/<namespace>/`.
Accepted files are `.mcfunction`, JSON, and optional root `README.md`; binaries,
NBT structures, build scripts and unsafe paths are not accepted. JSON and function
tag references are checked, and function commands with a leading slash are
rejected. These checks do not execute commands or validate every game schema.

Pack formats for the 51 listed releases are pinned in
`src/lib/datapack-versions.ts`, using [game-extracted metadata from
mcmeta](https://github.com/misode/mcmeta/blob/summary/versions/data.json).
The initial 1.13 releases use format 4. The 1.21 directory rename is documented in
[Mojang's 1.21 notes](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21).
Modern metadata uses the major/minor ranges described in the
[1.21.9 notes](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-9),
including the `94.1` datapack format in the
[1.21.11 notes](https://www.minecraft.net/en-us/article/minecraft-java-edition-1-21-11).
The server rewrites metadata for the exact selected release, removing stale
compatibility ranges. New game releases require a reviewed table update.

## Try the fixed example without AI

Download `/api/examples/datapack?version=1.21.4` from the homepage sample button.
An optional `version` query accepts any supported datapack release. Unknown and
pre-1.13 releases return HTTP 400. This endpoint calls no provider, spends no
credits and accesses no account or project data.

1. Put the ZIP directly into your test world's `datapacks` folder, without unpacking it.
2. Start the world with commands enabled, or use a server operator account.
3. Run `/reload`, then `/datapack list enabled`.
4. As a player, run `/function modhorizon:hello`.
5. Expect the aqua message “Your ModHorizon datapack is working!”

The sample runs only when invoked and changes no world blocks or items. Remove
its ZIP and run `/reload` to uninstall it. Automated checks verify packaging,
metadata and paths across the offered releases; no Minecraft runtime test is
claimed. Test custom commands and gameplay in a private world before installing
them in a world you care about.
