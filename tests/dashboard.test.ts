import assert from "node:assert/strict";
import test from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { openProjectDatabase } from "../src/lib/dashboard-db";
import { localDashboardEnabled, requireLocalRequest, authenticatedLibrary } from "../src/lib/dashboard-auth";
import { validateCreation, validateSnapshot } from "../src/lib/managed-project";

const input = { name: "Nightfall Rewards", description: "A new mechanic", kind: "plugin", platform: "paper", version: "1.21.4" };

test("project creation accepts supported artifact targets and rejects invalid platforms, versions, and fields", () => {
  assert.equal(validateCreation(input).platform, "paper");
  assert.equal(validateCreation({ ...input, kind: "mod", platform: "fabric" }).platform, "fabric");
  assert.equal(validateCreation({ ...input, kind: "resource_pack", platform: "vanilla" }).platform, "vanilla");
  assert.equal(validateCreation({ ...input, kind: "shader_pack", platform: "iris" }).platform, "iris");
  for (const change of [{ platform: "spigot" }, { kind: "mod", platform: "paper" }, { kind: "resource_pack", platform: "iris" }, { version: "9.9" }, { name: " " }, { name: "x".repeat(49) }, { description: "x".repeat(4001) }]) assert.throws(() => validateCreation({ ...input, ...change }));
});

test("local gate rejects production, unknown hosts, unauthenticated reads and forged mutation origins", async () => {
  assert.equal(localDashboardEnabled("127.0.0.1:3215", "development"), true);
  assert.equal(localDashboardEnabled("127.0.0.1:3215", "production"), false);
  assert.equal(localDashboardEnabled("public.example", "development"), false);
  assert.equal(localDashboardEnabled("localhost.evil.test", "development"), false);
  const original = process.env.NODE_ENV;
  Object.assign(process.env, { NODE_ENV: "development" });
  try {
    const request = (origin?: string) => new Request("http://127.0.0.1:3215/api/library/session", { method: "POST", headers: { host: "127.0.0.1:3215", ...(origin ? { origin } : {}) } });
    assert.throws(() => requireLocalRequest(request()), /same-origin/);
    assert.throws(() => requireLocalRequest(request("https://evil.test")), /same-origin/);
    assert.doesNotThrow(() => requireLocalRequest(request("http://127.0.0.1:3215")));
    await assert.rejects(authenticatedLibrary(new Request("http://127.0.0.1:3215/api/library/projects", { headers: { host: "127.0.0.1:3215" } })), /local dashboard session/);
  } finally { if (original === undefined) Reflect.deleteProperty(process.env, "NODE_ENV"); else Object.assign(process.env, { NODE_ENV: original }); }
});

test("project database persists creation, rename, star, source and deletion across connections", async () => {
  const folder = mkdtempSync(join(tmpdir(), "modhorizon-dashboard-")), path = join(folder, "library.sqlite");
  let db = await openProjectDatabase(path);
  try {
    const token = db.issueSession(), owner = db.session(token)!;
    assert.ok(owner); assert.equal(db.session("invalid"), null);
    assert.equal(db.profile().credits, null);
    db.setDisplayName("Test creator");
    let project = db.create(owner, validateCreation(input));
    assert.equal(db.list("another-owner").length, 0);
    assert.throws(() => db.get("another-owner", project.id), /not found/);
    assert.throws(() => db.update("another-owner", project.id, 1, { name: "Stolen" }), /not found/);
    project = db.update(owner, project.id, project.revision, { name: "Renamed project", starred: true });
    assert.throws(() => db.update(owner, project.id, 1, { name: "Stale write" }), /another tab/);
    assert.throws(() => db.delete(owner, project.id, 1), /Reload/);
    db.close(); db = await openProjectDatabase(path);
    assert.equal(db.session(token), owner);
    assert.equal(db.profile().displayName, "Test creator");
    const reloaded = db.get(owner, project.id);
    assert.equal(reloaded.name, "Renamed project"); assert.equal(reloaded.starred, true);
    assert.equal(reloaded.version, "1.21.4"); assert.equal(reloaded.createdAt, project.createdAt);
    assert.equal(reloaded.snapshot, null);
    db.revokeSession(token); assert.equal(db.session(token), null);
    db.delete(owner, project.id, project.revision);
    db.close(); db = await openProjectDatabase(path); assert.deepEqual(db.list(owner), []);
  } finally { db.close(); assert.ok(folder.startsWith(join(tmpdir(), "modhorizon-dashboard-"))); rmSync(folder, { recursive: true, force: true }); }
});

test("snapshot validation preserves real source, rejects unsafe files, and never restores expired artifact flags", async () => {
  // Use the same validated development example as the existing backend tests.
  const { MockProvider } = await import("../src/lib/mock-provider");
  const source = await new MockProvider().generate({ prompt: "Create a Paper plugin where players receive Speed II for 10 seconds whenever they kill a zombie.", version: "1.21.4" });
  const snapshot = validateSnapshot({ ...source, id: "existing-source-id", prompt: "Example source", version: "1.21.4", status: "preview", logs: [], provider: "mock", artifactAvailable: true });
  assert.equal(snapshot.artifactAvailable, false);
  assert.throws(() => validateSnapshot({ ...snapshot, files: [{ path: "../../escape.java", content: "bad" }] }));
  const db = await openProjectDatabase(":memory:");
  try {
    const owner = db.session(db.issueSession())!;
    const created = db.create(owner, validateCreation(input), snapshot);
    assert.equal(db.create(owner, validateCreation(input), snapshot).id, created.id, "imports are idempotent");
    const updated = db.update(owner, created.id, created.revision, { snapshot });
    assert.equal(db.get(owner, updated.id).snapshot?.files.length, snapshot.files.length);
    assert.throws(() => db.update(owner, updated.id, updated.revision, { snapshot: { ...snapshot, version: "1.21.11" } }), /version/);
  } finally { db.close(); }
});
