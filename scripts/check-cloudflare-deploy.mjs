import { readFileSync } from "node:fs";
const config = JSON.parse(readFileSync(new URL("../wrangler.jsonc", import.meta.url), "utf8"));
if (config.d1_databases[0].database_id === "00000000-0000-0000-0000-000000000000") {
  throw new Error("Create and populate a D1 database, then set its database_id in wrangler.jsonc. See CLOUDFLARE.md.");
}
const site = new URL(process.env.ATLAS_SITE_URL || "http://localhost");
if (site.protocol !== "https:" || /^(localhost|127\.|example\.)/.test(site.hostname)) {
  throw new Error("Set ATLAS_SITE_URL to the public HTTPS origin before deployment (canonical URLs).");
}
