import assert from "node:assert/strict";
import test from "node:test";
import { validateProject } from "../src/lib/validation";
import {
  MINECRAFT_RELEASES,
  PLATFORMS,
  PLATFORM_IDS,
  compareVersions,
  javaVersionFor,
  mappingsFor,
  versionLines,
} from "../src/lib/platforms";

const java = (path: string, pkg: string, body = "") => ({
  path: `src/main/java/${path}`,
  content: `package ${pkg};\n\n${body}\n`,
});
const res = (name: string, content: string) => ({ path: `src/main/resources/${name}`, content });

test("every platform lists real Minecraft releases newest first", () => {
  for (const id of PLATFORM_IDS) {
    const { versions, kind } = PLATFORMS[id];
    assert.ok(versions.length > 0, id);
    for (let index = 1; index < versions.length; index++)
      assert.ok(compareVersions(versions[index - 1], versions[index]) >= 0, `${id} order`);
    if (kind !== "proxy")
      for (const version of versions) assert.ok(MINECRAFT_RELEASES.includes(version as never), `${id} ${version}`);
  }
  assert.equal(MINECRAFT_RELEASES[0], "26.3");
  assert.equal(MINECRAFT_RELEASES.at(-1), "1.0");
});

test("java and mappings follow each version's requirements", () => {
  assert.equal(javaVersionFor("paper", "26.3"), 25);
  assert.equal(javaVersionFor("paper", "1.21.4"), 21);
  assert.equal(javaVersionFor("fabric", "1.20.1"), 17);
  assert.equal(javaVersionFor("forge", "1.17.1"), 16);
  assert.equal(javaVersionFor("forge", "1.12.2"), 8);
  assert.equal(javaVersionFor("velocity", "3.4.0"), 17);
  assert.equal(javaVersionFor("velocity", "4.3.0"), 25);
  assert.equal(javaVersionFor("bungeecord", "1.21-R0.4"), 8);
  assert.equal(mappingsFor("fabric", "1.14.2"), "yarn");
  assert.equal(mappingsFor("fabric", "1.21.11"), "mojang");
  assert.equal(mappingsFor("forge", "1.16.5"), "mcp");
  assert.equal(mappingsFor("paper", "1.21.11"), "none");
});

test("version lines group patches under their release line", () => {
  assert.deepEqual(versionLines(["26.1.2", "26.1", "1.21.11", "1.21"]), [
    { line: "26.1", versions: ["26.1.2", "26.1"] },
    { line: "1.21", versions: ["1.21.11", "1.21"] },
  ]);
});

test("each loader requires its own descriptor pointing at included classes", () => {
  const fabric = {
    name: "Glow",
    files: [
      java("dev/mh/glow/Glow.java", "dev.mh.glow", "public class Glow {}"),
      res("fabric.mod.json", JSON.stringify({ schemaVersion: 1, id: "glow", entrypoints: { main: ["dev.mh.glow.Glow"] } })),
      res("glow.mixins.json", "{}"),
      res("assets/glow/lang/en_us.json", "{}"),
    ],
  };
  assert.doesNotThrow(() => validateProject(fabric, "fabric", "1.21.11"));
  assert.throws(() => validateProject(fabric, "quilt", "1.21.11"), /quilt\.mod\.json/);
  assert.throws(
    () => validateProject({ ...fabric, files: [fabric.files[0], res("fabric.mod.json", JSON.stringify({ schemaVersion: 1, id: "glow", entrypoints: { main: ["dev.mh.glow.Missing"] } }))] }, "fabric", "1.21.11"),
    /included Java source/,
  );

  const modern = (toml: string) => ({
    name: "Glow",
    files: [java("dev/mh/glow/Glow.java", "dev.mh.glow", '@Mod("glow")\npublic class Glow {}'), res(toml, 'modLoader="javafml"\n[[mods]]\nmodId="glow"\n')],
  });
  assert.doesNotThrow(() => validateProject(modern("META-INF/neoforge.mods.toml"), "neoforge", "1.21.1"));
  assert.throws(() => validateProject(modern("META-INF/mods.toml"), "neoforge", "1.21.1"), /neoforge\.mods\.toml/);
  assert.doesNotThrow(() => validateProject(modern("META-INF/mods.toml"), "neoforge", "1.20.4"));
  assert.doesNotThrow(() => validateProject(modern("META-INF/mods.toml"), "forge", "1.20.1"));

  const legacyForge = {
    name: "Glow",
    files: [java("dev/mh/glow/Glow.java", "dev.mh.glow", '@Mod(modid = "glow")\npublic class Glow {}'), res("mcmod.info", '[{"modid":"glow"}]')],
  };
  assert.doesNotThrow(() => validateProject(legacyForge, "forge", "1.12.2"));
  assert.throws(() => validateProject(legacyForge, "forge", "1.16.5"), /mods\.toml/);

  const velocity = {
    name: "Lobby",
    files: [java("dev/mh/lobby/Lobby.java", "dev.mh.lobby", "public class Lobby {}"), res("velocity-plugin.json", '{"id":"lobby","main":"dev.mh.lobby.Lobby"}')],
  };
  assert.doesNotThrow(() => validateProject(velocity, "velocity", "3.4.0"));
  const bungee = {
    name: "Lobby",
    files: [java("dev/mh/lobby/Lobby.java", "dev.mh.lobby", "public class Lobby {}"), res("bungee.yml", "name: Lobby\nmain: dev.mh.lobby.Lobby\n")],
  };
  assert.doesNotThrow(() => validateProject(bungee, "bungeecord", "1.21-R0.4"));
});

test("bukkit-family rules depend on version and platform", () => {
  const plugin = (yml: string) => ({
    name: "Old",
    files: [java("dev/mh/old/Old.java", "dev.mh.old", "public class Old {}"), res("plugin.yml", yml)],
  });
  const legacy = plugin("name: Old\nmain: dev.mh.old.Old\nversion: 1.0\n");
  assert.doesNotThrow(() => validateProject(legacy, "spigot", "1.8.8"));
  assert.throws(() => validateProject(legacy, "spigot", "1.13"), /api-version/);
  const modern = plugin("name: Old\nmain: dev.mh.old.Old\napi-version: '1.21'\n");
  assert.throws(() => validateProject(modern, "folia", "1.21.4"), /folia-supported/);
  assert.doesNotThrow(() =>
    validateProject(plugin("name: Old\nmain: dev.mh.old.Old\napi-version: '1.21'\nfolia-supported: true\n"), "folia", "1.21.4"),
  );
});

test("incompatible versions explain why and suggest alternatives", async () => {
  const { incompatibility } = await import("../src/lib/platforms");
  const { validateRequest } = await import("../src/lib/validation");
  assert.equal(incompatibility("fabric", "1.21.11"), null);
  const tooOld = incompatibility("fabric", "1.12.2")!;
  assert.match(tooOld.title, /Fabric can't be used with Minecraft 1\.12\.2/);
  assert.match(tooOld.reason, /launched alongside Minecraft 1\.14/);
  assert.ok(tooOld.alternatives.includes("forge"));
  assert.equal(tooOld.nearest, "1.14");
  const skipped = incompatibility("forge", "1.21.2")!;
  assert.match(skipped.reason, /never released a stable build/);
  assert.ok(skipped.alternatives.includes("fabric"));
  const ancient = incompatibility("forge", "1.0")!;
  assert.match(ancient.reason, /oldest release any of them supports is 1\.1\./);
  assert.deepEqual(ancient.alternatives, []);
  // 1.9.1 sits between supported releases, so it was skipped rather than too early.
  assert.match(incompatibility("paper", "1.9.1")!.reason, /They all skipped it, so projects target 1\.9\.2|They all skipped it, so projects target 1\.9\.4/);
  assert.throws(
    () => validateRequest({ prompt: "A mod that adds a glowing sword item.", platform: "neoforge", version: "1.19.2" }),
    /NeoForge can't be used with Minecraft 1\.19\.2\. NeoForge split off/,
  );
});
