/** Local, deterministic adapter. Downloads and network execution are intentionally separate. */
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { z } from "zod";
const { values } = parseArgs({ options: { input:{type:"string"}, output:{type:"string"}, revision:{type:"string"} } });
if (!values.input || !values.output || !/^[a-f0-9]{40}$/.test(values.revision ?? "")) throw new Error("Usage: node --import tsx scripts/prepare-ringmast4r.ts --input FILE --output FILE --revision FULL_COMMIT_SHA");
const rows = z.array(z.object({ name:z.string(), company:z.string().nullable(), city:z.string(), state:z.string(), country:z.string(), address:z.string(), city_coords:z.union([z.tuple([z.union([z.number(),z.string()]),z.union([z.number(),z.string()])]),z.tuple([])]).nullable().optional(), capacity_mw:z.number().nullable().optional(), status:z.string().nullable().optional() })).parse(JSON.parse(readFileSync(values.input,"utf8")));
const sourceUrl = `https://github.com/Ringmast4r/Global-Data-Center-Map/tree/${values.revision}`;
const normalized = rows.map(row => {
  // Upstream has no IDs. Do not use row number, revision, coordinates, or mutable metrics.
  // Identity changes require review on a later snapshot; they are not silently merged.
  const key = [row.name,row.company,row.country,row.city,row.state,row.address].map(s => (s ?? "").trim().normalize("NFKC").toLowerCase());
  const sourceId = `derived-${createHash("sha256").update(JSON.stringify(key)).digest("hex")}`;
  const description = `Data centers (c) Ringmast4r - Global-Data-Center-Map. Source coordinates may represent a city, state or country centroid; not verified facility locations.${row.status ? ` Source status: ${row.status}.` : ""}${row.state ? ` Source region: ${row.state}.` : ""}`;
  return {sourceId,name:row.name,operator:row.company,country:row.country,city:row.city,address:row.address,
    latitude:row.city_coords?.[0] ?? null,longitude:row.city_coords?.[1] ?? null,
    powerCapacityMw:row.capacity_mw ?? null,status:row.status === "Operating" ? "operational" : row.status === "Planned" ? "planned" : null,
    description,sourceUrl};
});
const header = Object.keys(normalized[0] ?? {});
if (!header.length) throw new Error("Dataset is empty");
const cell = (v:unknown) => `"${String(v ?? "").replaceAll('"','""')}"`;
writeFileSync(values.output,[header.join(","),...normalized.map(row => header.map(key => cell(row[key as keyof typeof row])).join(","))].join("\n")+"\n");
console.log(JSON.stringify({rows:rows.length,output:values.output,revision:values.revision,sourceIdPolicy:"Derived from name/company/country/city/state/address; upstream publishes no native identifiers"}));
