import type { DatabaseSync } from "node:sqlite";
import { createHash } from "node:crypto";

export const snapshotTables = ["facilities","facility_routes","research_queue","research_profiles","research_sources","research_facts"] as const;
function literal(value: unknown): string {
  if(value===null) return "NULL";
  if(typeof value==="number" && Number.isFinite(value)) return String(value);
  if(typeof value==="string") return "'"+value.replaceAll("'","''")+"'";
  throw new Error("Unexpected value in D1 snapshot");
}
/** Additive, repeatable upserts. Never deletes absent facilities or research.
 * Publish a fresh snapshot DB and change its binding to avoid live partial imports.
 */
export function exportD1Snapshot(db: DatabaseSync) {
  db.exec("BEGIN");
  try {
    const counts: Record<string,number> = {};
    const statements = ["-- Atlas D1 snapshot. Apply migrations first. Contains no DROP/DELETE statements."];
    for(const table of snapshotTables) {
      const columns = db.prepare(`PRAGMA table_info(${table})`).all();
      if(!columns.length) throw new Error(`Missing ${table}; run npm run db:migrate first`);
      const names = columns.map(c=>String(c.name));
      const keys = columns.filter(c=>Number(c.pk)>0).sort((a,b)=>Number(a.pk)-Number(b.pk)).map(c=>String(c.name));
      const updates = names.filter(n=>!keys.includes(n)).map(n=>`"${n}"=excluded."${n}"`).join(",");
      const rows = db.prepare(`SELECT * FROM ${table} ORDER BY ${keys.join(",")}`).all();
      counts[table]=rows.length;
      for(const row of rows) statements.push(`INSERT INTO ${table} (${names.map(n=>`"${n}"`).join(",")}) VALUES (${names.map(n=>literal(row[n])).join(",")}) ON CONFLICT (${keys.join(",")}) DO UPDATE SET ${updates};`);
    }
    const mapped = Number(db.prepare("SELECT count(*) AS n FROM facilities WHERE is_demo=0 AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180").get()!.n);
    const sql=statements.join("\n")+"\n";
    return {sql,manifest:{createdAt:new Date().toISOString(),tables:counts,mappedFacilities:mapped,sha256:createHash("sha256").update(sql).digest("hex")}};
  } finally { db.exec("ROLLBACK"); }
}
