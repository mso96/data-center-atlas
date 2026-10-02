import "server-only";
import { getProfile } from "./research/profiles";
import type { ResearchProfile } from "../domain/research/profile";
import { DemoDataCenterRepository } from "./demo/repository";
import { SqliteDataCenterRepository } from "./sqlite/repository";
import { openDatabase, defaultDatabasePath } from "./sqlite/database";
import type { DataCenterRepository } from "./repository";
export function openRepository(): { repository: DataCenterRepository; mode: "demo" | "imported"; close: () => void; getResearch: (id:string) => ResearchProfile | null } {
  const mode = process.env.ATLAS_DATA_MODE ?? "demo";
  if (mode === "demo") return { repository: new DemoDataCenterRepository(), mode, getResearch:()=>null, close() {} };
  if (mode !== "imported") throw new Error("ATLAS_DATA_MODE must be demo or imported");
  const db = openDatabase(defaultDatabasePath(), true);
  db.exec("BEGIN"); // One consistent read snapshot across list, counts, and map.
  return { repository: new SqliteDataCenterRepository(db), mode, getResearch:id=>getProfile(db,id), close: () => db.close() };
}
