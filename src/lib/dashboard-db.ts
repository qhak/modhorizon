import { randomBytes, randomUUID, createHash } from "node:crypto";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import type { DatabaseSync } from "node:sqlite";
import type { CreateProject, ManagedProject, LocalProfile } from "./managed-project";
import type { Project } from "./types";

type Row = Record<string, string | number | null>;
const owner = "local-owner";
const hash = (token: string) => createHash("sha256").update(token).digest("hex");
export class LibraryError extends Error { constructor(message: string, public status = 404) { super(message); this.name = "LibraryError"; } }

/** Local, file-backed SQLite. The API gate never opens this database in production. */
export class ProjectDatabase {
  constructor(readonly db: DatabaseSync, initialize = true) {
    if (!initialize) return;
    db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
      CREATE TABLE IF NOT EXISTS profiles (id TEXT PRIMARY KEY, display_name TEXT NOT NULL);
      INSERT OR IGNORE INTO profiles VALUES ('local-owner', '');
      CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES profiles(id), expires_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES profiles(id), name TEXT NOT NULL,
        description TEXT NOT NULL, version TEXT NOT NULL, created_at INTEGER NOT NULL, updated_at INTEGER NOT NULL,
        starred INTEGER NOT NULL DEFAULT 0, revision INTEGER NOT NULL DEFAULT 1, snapshot TEXT, legacy_id TEXT,
        UNIQUE(owner_id, legacy_id));
      CREATE INDEX IF NOT EXISTS projects_owner_updated ON projects(owner_id, updated_at DESC);`);
  }
  profile(): LocalProfile {
    const row = this.db.prepare("SELECT display_name FROM profiles WHERE id = ?").get(owner) as Row;
    return { displayName: String(row.display_name), credits: null, mode: "local" };
  }
  setDisplayName(name: string) { this.db.prepare("UPDATE profiles SET display_name = ? WHERE id = ?").run(name, owner); return this.profile(); }
  issueSession() {
    const token = randomBytes(32).toString("base64url");
    this.db.prepare("DELETE FROM sessions WHERE expires_at < ?").run(Date.now());
    this.db.prepare("INSERT INTO sessions VALUES (?, ?, ?)").run(hash(token), owner, Date.now() + 7 * 86400_000);
    return token;
  }
  session(token?: string): string | null {
    if (!token || !/^[\w-]{43}$/.test(token)) return null;
    const row = this.db.prepare("SELECT owner_id FROM sessions WHERE token_hash = ? AND expires_at > ?").get(hash(token), Date.now()) as Row | undefined;
    return row ? String(row.owner_id) : null;
  }
  revokeSession(token: string) { this.db.prepare("DELETE FROM sessions WHERE token_hash = ?").run(hash(token)); }
  private decode(row: Row): ManagedProject {
    return { id: String(row.id), name: String(row.name), description: String(row.description), kind: "plugin", platform: "paper", version: row.version as ManagedProject["version"], createdAt: Number(row.created_at), updatedAt: Number(row.updated_at), starred: Boolean(row.starred), revision: Number(row.revision), snapshot: row.snapshot ? JSON.parse(String(row.snapshot)) : null, legacyId: row.legacy_id ? String(row.legacy_id) : null };
  }
  list(ownerId: string) { return (this.db.prepare("SELECT * FROM projects WHERE owner_id = ? ORDER BY updated_at DESC").all(ownerId) as Row[]).map(row => this.decode(row)); }
  get(ownerId: string, id: string): ManagedProject {
    const row = this.db.prepare("SELECT * FROM projects WHERE id = ? AND owner_id = ?").get(id, ownerId) as Row | undefined;
    if (!row) throw new LibraryError("Project not found.");
    return this.decode(row);
  }
  create(ownerId: string, input: CreateProject, legacy?: Project) {
    if (legacy) {
      const row = this.db.prepare("SELECT * FROM projects WHERE owner_id = ? AND legacy_id = ?").get(ownerId, legacy.id) as Row | undefined;
      if (row) return this.decode(row);
    }
    const id = randomUUID(), now = Date.now();
    this.db.prepare("INSERT INTO projects (id,owner_id,name,description,version,created_at,updated_at,snapshot,legacy_id) VALUES (?,?,?,?,?,?,?,?,?)")
      .run(id, ownerId, input.name, input.description, input.version, now, now, legacy ? JSON.stringify(legacy) : null, legacy?.id ?? null);
    return this.get(ownerId, id);
  }
  update(ownerId: string, id: string, revision: number, changes: { name?: string; starred?: boolean; snapshot?: Project }) {
    const current = this.get(ownerId, id);
    if (changes.snapshot && changes.snapshot.version !== current.version) throw new LibraryError("Source version must match this project.", 400);
    const result = this.db.prepare("UPDATE projects SET name=?,starred=?,snapshot=?,updated_at=?,revision=revision+1 WHERE id=? AND owner_id=? AND revision=?")
      .run(changes.name ?? current.name, Number(changes.starred ?? current.starred), changes.snapshot ? JSON.stringify(changes.snapshot) : current.snapshot ? JSON.stringify(current.snapshot) : null, Math.max(Date.now(), current.updatedAt + 1), id, ownerId, revision);
    if (result.changes !== 1) throw new LibraryError("This project changed in another tab. Reload before saving.", 409);
    return this.get(ownerId, id);
  }
  delete(ownerId: string, id: string, revision: number) {
    this.get(ownerId, id);
    if (this.db.prepare("DELETE FROM projects WHERE id=? AND owner_id=? AND revision=?").run(id, ownerId, revision).changes !== 1) throw new LibraryError("This project changed. Reload before deleting.", 409);
  }
  close() { this.db.close(); }
}
export async function openProjectDatabase(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const { DatabaseSync } = await import("node:sqlite");
  return new ProjectDatabase(new DatabaseSync(path, { timeout: 5000 }));
}
const shared = globalThis as typeof globalThis & { modhorizonSqlite?: Promise<DatabaseSync> };
export function dashboardDatabase() {
  // This is deliberately not enabled by an environment switch in hosted production.
  if (process.env.NODE_ENV !== "development") throw new LibraryError("Local project storage is disabled in production.", 503);
  // Cache the native connection, not a class instance compiled by another route or hot reload.
  const connection = shared.modhorizonSqlite ??= openProjectDatabase(join(process.cwd(), ".data", "modhorizon.sqlite")).then(repository => repository.db);
  return connection.then(db => new ProjectDatabase(db, false));
}
