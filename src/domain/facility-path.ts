import type { DataCenter } from "./data-center";
export function slugify(value: string) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/&/g," and ").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"");
}
export function baseFacilityPath(record: Pick<DataCenter,"id"|"name"|"country"|"countryCode">) {
  const country = record.countryCode === "GB" ? "united-kingdom" : slugify(record.country ?? record.countryCode ?? "unknown-country");
  return `/${country || "unknown-country"}/${slugify(record.name.replace(/^Demo — /,"")) || "data-center"}`;
}
/** Existing allocations are retained so later imports cannot change a shared URL. */
export function allocateFacilityPath(record: Pick<DataCenter,"id"|"name"|"country"|"countryCode">, used: Set<string>) {
  const base=baseFacilityPath(record);
  let path=base;
  let suffix=2;
  while(used.has(path)) path=`${base}-${suffix++}`;
  used.add(path);
  return path;
}
