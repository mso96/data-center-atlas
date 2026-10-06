import { readFileSync } from "node:fs";
const bundle = readFileSync(new URL("../.open-next/server-functions/default/handler.mjs", import.meta.url), "utf8");
if (!bundle.includes("D1 DB binding is required") || bundle.includes("DatabaseSync")) {
  throw new Error("Cloudflare build must include the D1 entry point and exclude native SQLite. Use npm run cf:build.");
}
console.log("Cloudflare bundle verified: D1 adapter present; native SQLite excluded.");
