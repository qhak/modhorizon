import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { DatabaseSync, type SQLInputValue } from "node:sqlite";
import type { D1Database, D1Result, D1Statement } from "../src/lib/billing-db";
import { holdCredits, completeCreditReservation } from "../src/lib/credit-reservations";

// Execute the production SQL and migrations against SQLite, including transaction rollback.
class Statement implements D1Statement {
  constructor(private sqlite: DatabaseSync, private query: string, private values: SQLInputValue[] = []) {}
  bind(...values: unknown[]) { return new Statement(this.sqlite, this.query, values as SQLInputValue[]); }
  async first<T>(column?: string): Promise<T | null> {
    const row = this.sqlite.prepare(this.query).get(...this.values);
    return (column ? row?.[column] : row) as T ?? null;
  }
  async all<T>(): Promise<D1Result<T>> {
    return { results: this.sqlite.prepare(this.query).all(...this.values) as T[], meta: { changes: 0 } };
  }
  execute<T>(): D1Result<T> {
    return { meta: { changes: Number(this.sqlite.prepare(this.query).run(...this.values).changes) } };
  }
  async run<T>() { return this.execute<T>(); }
}

function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys=ON");
  for (const name of ["0001_billing.sql", "0002_generation_reservations.sql"])
    sqlite.exec(readFileSync(new URL(`../migrations/${name}`, import.meta.url), "utf8"));
  sqlite.prepare(`INSERT INTO billing_accounts(id,credit_balance,created_at,updated_at)
    VALUES('owner',100,0,0),('other',100,0,0)`).run();
  const db: D1Database = {
    prepare(query) { return new Statement(sqlite, query); },
    async batch<T>(statements: D1Statement[]): Promise<D1Result<T>[]> {
      sqlite.exec("BEGIN IMMEDIATE");
      try {
        const results = statements.map(statement => (statement as Statement).execute<T>());
        sqlite.exec("COMMIT");
        return results;
      } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  const balance = () => Number(sqlite.prepare("SELECT credit_balance FROM billing_accounts WHERE id='owner'").get()!.credit_balance);
  const ledger = () => sqlite.prepare("SELECT delta,reason FROM credit_ledger WHERE account_id='owner'").all();
  return { db, sqlite, balance, ledger };
}

test("duplicate settlement and a later refund charge only once", async () => {
  const { db, sqlite, balance, ledger } = database();
  try {
    const id = (await holdCredits(db, "owner", "gpt-6-luna", 40))!;
    assert.equal(balance(), 60);
    assert.equal(await completeCreditReservation(db, "owner", id, "settled", 12), 12);
    assert.equal(balance(), 88);
    await completeCreditReservation(db, "owner", id, "settled", 12);
    await completeCreditReservation(db, "owner", id, "refunded");
    assert.equal(balance(), 88);
    assert.equal(ledger().length, 2);
    assert.equal(ledger().reduce((sum, row) => sum + Number(row.delta), 0), -12);
  } finally { sqlite.close(); }
});

test("concurrent refund and settlement cannot both credit the same reservation", async () => {
  const { db, sqlite, balance, ledger } = database();
  try {
    const id = (await holdCredits(db, "owner", "gpt-6-luna", 40))!;
    await Promise.all([
      completeCreditReservation(db, "owner", id, "refunded"),
      completeCreditReservation(db, "owner", id, "settled", 10),
      completeCreditReservation(db, "owner", id, "refunded"),
    ]);
    assert.ok(balance() === 100 || balance() === 90);
    assert.equal(ledger().length, 2);
    assert.equal(100 + ledger().reduce((sum, row) => sum + Number(row.delta), 0), balance());
  } finally { sqlite.close(); }
});

test("racing holds cannot overspend, and rejected holds create no ledger entry", async () => {
  const { db, sqlite, balance, ledger } = database();
  try {
    const ids = await Promise.all([holdCredits(db, "owner", "model", 80), holdCredits(db, "owner", "model", 80)]);
    assert.equal(ids.filter(Boolean).length, 1);
    assert.equal(balance(), 20);
    assert.equal(ledger().length, 1);
  } finally { sqlite.close(); }
});

test("reservations enforce ownership, reject invalid amounts and cap charges at the hold", async () => {
  const { db, sqlite, balance } = database();
  try {
    for (const amount of [-1, 0, 0.5, NaN, Infinity])
      await assert.rejects(holdCredits(db, "owner", "model", amount));
    const id = (await holdCredits(db, "owner", "model", 25))!;
    await assert.rejects(completeCreditReservation(db, "other", id, "refunded"), /not found/);
    await assert.rejects(completeCreditReservation(db, "owner", id, "settled", -10));
    assert.equal(balance(), 75);
    assert.equal(await completeCreditReservation(db, "owner", id, "settled", 90), 25);
    assert.equal(balance(), 75);
  } finally { sqlite.close(); }
});

test("a failed ledger insert rolls back the debit and reservation together", async () => {
  const { db, sqlite, balance, ledger } = database();
  try {
    sqlite.exec("CREATE TRIGGER reject_ledger BEFORE INSERT ON credit_ledger BEGIN SELECT RAISE(ABORT,'simulated outage'); END");
    await assert.rejects(holdCredits(db, "owner", "model", 40), /simulated outage/);
    assert.equal(balance(), 100);
    assert.equal(ledger().length, 0);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS total FROM generation_credit_reservations").get()!.total, 0);
  } finally { sqlite.close(); }
});

test("a failed completion leaves the hold intact and can be retried safely", async () => {
  const { db, sqlite, balance, ledger } = database();
  try {
    const id = (await holdCredits(db, "owner", "model", 40))!;
    sqlite.exec("CREATE TRIGGER reject_ledger BEFORE INSERT ON credit_ledger BEGIN SELECT RAISE(ABORT,'simulated outage'); END");
    await assert.rejects(completeCreditReservation(db, "owner", id, "settled", 12), /simulated outage/);
    assert.equal(balance(), 60);
    assert.equal(sqlite.prepare("SELECT state FROM generation_credit_reservations WHERE id=?").get(id)!.state, "held");
    sqlite.exec("DROP TRIGGER reject_ledger");
    await completeCreditReservation(db, "owner", id, "settled", 12);
    assert.equal(balance(), 88);
    assert.equal(ledger().length, 2);
  } finally { sqlite.close(); }
});
