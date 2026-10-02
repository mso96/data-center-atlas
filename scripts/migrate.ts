import { openDatabase, migrate, defaultDatabasePath } from "../src/data/sqlite/database";
const db = openDatabase(defaultDatabasePath());
try { migrate(db); console.log("SQLite migrations applied."); } finally { db.close(); }
