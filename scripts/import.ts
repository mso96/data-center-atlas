import { readFileSync, existsSync } from "node:fs";
import { parseArgs } from "node:util";
import { openDatabase,migrate,defaultDatabasePath } from "../src/data/sqlite/database";
import { importRecords } from "../src/import/importer";
try {
  const { values } = parseArgs({ options: {
    file:{type:"string"}, mapping:{type:"string"}, source:{type:"string"}, format:{type:"string"},
    db:{type:"string"}, "dry-run":{type:"boolean"}, fixture:{type:"boolean"}, "authorized":{type:"boolean"},
  } });
  if (!values.file || !values.mapping || !values.source || !["csv","geojson"].includes(values.format ?? "")) throw new Error("Usage: npm run import -- --file PATH --mapping PATH --source NAMESPACE --format csv|geojson [--db PATH] [--dry-run] --fixture|--authorized");
  if (Boolean(values.fixture) === Boolean(values.authorized)) throw new Error("Choose exactly one: --fixture for fictional data, or --authorized to attest you hold rights for this dataset and its intended use");
  const filename = values.db ?? defaultDatabasePath();
  const dryRun = values["dry-run"] ?? false;
  // Dry run never creates a database or migrates an existing file.
  const absentDryRun = dryRun && !existsSync(filename);
  const db = openDatabase(absentDryRun ? ":memory:" : filename,dryRun && !absentDryRun);
  try {
    if (!dryRun || absentDryRun) migrate(db);
    const report = importRecords(db,readFileSync(values.file,"utf8"),values.format as "csv"|"geojson",JSON.parse(readFileSync(values.mapping,"utf8")),values.source,values.fixture ?? false,dryRun);
    console.log(JSON.stringify(report,null,2)); if(report.invalid) process.exitCode=1;
  } finally { db.close(); }
} catch(error) { console.error(JSON.stringify({error:error instanceof Error ? error.message : "Import failed"})); process.exitCode=1; }
