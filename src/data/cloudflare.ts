import "server-only";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { DemoDataCenterRepository } from "./demo/repository";
import { D1DataCenterRepository } from "./d1/repository";

// Replaces the Node-only entry point at build time. No filesystem or SQLite
// native module is reachable from this Worker entry point.
export function openRepository() {
  const { env } = getCloudflareContext();
  const mode: string = env.ATLAS_DATA_MODE;
  const dataset = env.ATLAS_DATASET;
  if (mode === "demo") return { repository: new DemoDataCenterRepository(), mode, dataset, getResearch: () => null, close() {} };
  if (mode !== "imported") throw new Error("ATLAS_DATA_MODE must be demo or imported");
  if (!env.DB) throw new Error("D1 DB binding is required for imported data");
  // A new session per request keeps reads sequentially consistent. Publishing
  // uses a fresh database snapshot, so related reads see immutable source data.
  const repository = new D1DataCenterRepository(env.DB.withSession("first-primary"));
  return { repository, mode, dataset, getResearch: (id: string) => repository.getResearch(id), close() {} };
}
