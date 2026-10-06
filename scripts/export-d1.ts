import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { defaultDatabasePath } from "../src/data/sqlite/database";
import { exportD1Snapshot } from "../src/data/d1/export";

const db = new DatabaseSync(process.argv[2] ?? defaultDatabasePath(), {readOnly:true});
try {
  const {sql,manifest} = exportD1Snapshot(db);
  const output = process.argv[3] ?? "data/d1-snapshot.sql";
  mkdirSync(path.dirname(output),{recursive:true});
  writeFileSync(output,sql);
  writeFileSync(`${output}.json`,JSON.stringify(manifest,null,2)+"\n");
  console.log(JSON.stringify({output,...manifest},null,2));
} finally { db.close(); }
