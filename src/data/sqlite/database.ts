import { DatabaseSync } from "node:sqlite";
import { readFileSync, readdirSync, mkdirSync } from "node:fs";
import path from "node:path";
import type { DataCenter } from "../../domain/data-center";
import { dataCenterSchema } from "../../domain/validation";
export const defaultDatabasePath = () => process.env.ATLAS_DB_PATH ?? path.join(process.cwd(), "data", "atlas.sqlite");
export const norm = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";
export const identityKey = (record: DataCenter) => JSON.stringify([record.name, record.operator, record.countryCode, record.city].map(norm));
export function openDatabase(filename: string, readOnly = false) {
  if (!readOnly && filename !== ":memory:") mkdirSync(path.dirname(path.resolve(filename)), { recursive: true });
  const db = new DatabaseSync(filename, { readOnly });
  db.exec("PRAGMA busy_timeout=5000; PRAGMA foreign_keys=ON;");
  return db;
}
export function migrate(db: DatabaseSync) {
  db.exec("PRAGMA journal_mode=WAL;");
  db.exec("CREATE TABLE IF NOT EXISTS schema_migrations (version TEXT PRIMARY KEY, applied_at TEXT NOT NULL) STRICT;");
  for (const file of readdirSync(path.join(process.cwd(), "migrations")).filter(f => f.endsWith(".sql")).sort()) {
    db.exec("BEGIN IMMEDIATE");
    try {
      if (!db.prepare("SELECT 1 FROM schema_migrations WHERE version=?").get(file)) {
        db.exec(readFileSync(path.join(process.cwd(), "migrations", file), "utf8"));
        db.prepare("INSERT INTO schema_migrations VALUES (?,?)").run(file, new Date().toISOString());
      }
      db.exec("COMMIT");
    } catch (error) { db.exec("ROLLBACK"); throw error; }
  }
}
export function writeRecord(db: DatabaseSync, source: string, value: DataCenter) {
  const record = dataCenterSchema.parse(value);
  if (!record.sourceId) throw new Error("Persistent records require a stable sourceId");
  db.prepare(`INSERT INTO facilities VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(source_key,source_id) DO UPDATE SET
    is_demo=excluded.is_demo,country_code=excluded.country_code,city=excluded.city,
    operator=excluded.operator,status=excluded.status,search_text=excluded.search_text,
    identity_key=excluded.identity_key,latitude=excluded.latitude,longitude=excluded.longitude,record=excluded.record`).run(
    record.id, source, record.sourceId, Number(record.isDemo), norm(record.countryCode) || null,
    norm(record.city) || null, norm(record.operator) || null, record.status,
    [record.name, record.operator, record.countryCode, record.country, record.city, record.address, record.description].map(norm).join("\n"),
    identityKey(record), record.latitude, record.longitude, JSON.stringify(record));
}
