import { dataPackFormat } from "./datapack-versions";
import { validateProject } from "./validation";

/** A fixed, readable example; downloading it never calls an AI provider or spends credits. */
export function exampleDatapack(version: string) {
  const format = dataPackFormat(version);
  if (!format) throw new Error("Choose a supported Minecraft Java release from 1.13 onward.");
  const directory = format[0] >= 48 ? "function" : "functions";
  return validateProject({
    name: "ModHorizonHello",
    files: [
      { path: "pack.mcmeta", content: JSON.stringify({ pack: { pack_format: format[0], description: "ModHorizon: a simple hello-world datapack" } }) },
      { path: `data/modhorizon/${directory}/hello.mcfunction`, content: 'tellraw @s {"text":"Your ModHorizon datapack is working!","color":"aqua"}\n' },
      { path: "README.md", content: `# ModHorizon Hello\n\nA fixed example for Minecraft Java ${version}; no AI generation or credits required.\n\n1. Put the ZIP directly in your test world's datapacks folder. Do not unpack it.\n2. Open the world with commands enabled, or use an operator account on a server.\n3. Run /reload and /datapack list enabled.\n4. As a player, run /function modhorizon:hello.\n5. Expect the aqua message: Your ModHorizon datapack is working!\n\nThis pack does not run automatically, change blocks or grant items. Remove its ZIP and run /reload to uninstall.\nThe archive and metadata are checked by ModHorizon; an in-game runtime test is still required.\n` },
    ],
  }, "datapack", "vanilla", version);
}
