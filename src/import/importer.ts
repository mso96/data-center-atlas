import { parse } from "csv-parse/sync";
import { createHash } from "node:crypto";
import type { DatabaseSync } from "node:sqlite";
import { z } from "zod";
import { dataCenterSchema, normalizeCountry } from "../domain/validation";
import type { DataCenter } from "../domain/data-center";
import { identityKey, writeRecord } from "../data/sqlite/database";
const fields = ["sourceId","name","operator","countryCode","country","city","address","latitude","longitude","description","imageUrl","status","powerCapacityMw","facilityAreaSqM","tierLevel","tierCertification","pue","operationalYear","sourceUrl","sourceUpdatedAt"] as const;
const mappingSchema = z.object({
  columns: z.partialRecord(z.enum(fields), z.string().min(1)).refine(c => c.sourceId && c.name, "columns.sourceId and columns.name are required"),
  units: z.object({ power: z.enum(["MW","kW","W"]).default("MW"), area: z.enum(["m2","ft2"]).default("m2") }).default({ power:"MW",area:"m2" }),
  countryAliases: z.record(z.string(),z.string()).default({}),
  statusAliases: z.record(z.string(),z.string()).default({}),
}).strict();
export type ImportMapping = z.input<typeof mappingSchema>;
type InputRow = { values: Record<string, unknown>; geometry?: unknown; geoId?: unknown; problem?: string };
export type RowReport = { row: number; sourceId: string | null; status: "inserted" | "updated" | "skipped" | "invalid"; reason: string };
export interface ImportReport { dryRun: boolean; inserted: number; updated: number; skipped: number; invalid: number; rows: RowReport[] }
const stringValue = (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value !== "string" && typeof value !== "number") throw new Error("Expected a string or number, not an object/boolean");
  if (typeof value === "number" && (!Number.isFinite(value) || (Number.isInteger(value) && !Number.isSafeInteger(value)))) throw new Error("Unsafe numeric value; provide identifiers as strings");
  const text = String(value).trim();
  return !text || /^(null|n\/a|unknown|not available)$/i.test(text) ? null : text;
};
const numberValue = (value: string | null, field: string) => {
  if (value === null) return null;
  if (!/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(value)) throw new Error(`${field}: use a decimal number without thousands separators or unit suffixes`);
  const result = Number(value);
  if (!Number.isFinite(result)) throw new Error(`${field}: must be finite`);
  return result;
};
function normalizeDate(value: string | null) {
  if (!value) return null;
  if (z.iso.date().safeParse(value).success) return value;
  if (z.iso.datetime({ offset: true }).safeParse(value).success) return new Date(value).toISOString();
  throw new Error("sourceUpdatedAt: expected a valid YYYY-MM-DD or ISO timestamp with timezone");
}
export function parseInput(input: string, format: "csv" | "geojson"): InputRow[] {
  if (format === "csv") {
    const records = parse(input, { bom: true, skip_empty_lines: true, relax_column_count: true, columns: false }) as string[][];
    if (!records.length) throw new Error("CSV has no header");
    const header = records.shift()!.map(s => s.trim());
    if (new Set(header).size !== header.length || header.some(s => !s)) throw new Error("CSV headers must be unique and nonempty");
    return records.map(row => ({ values: Object.fromEntries(header.map((key,i) => [key,row[i]])), problem: row.length === header.length ? undefined : "CSV row length does not match header" }));
  }
  const collection = JSON.parse(input);
  if (collection.type !== "FeatureCollection" || !Array.isArray(collection.features)) throw new Error("Expected a GeoJSON FeatureCollection");
  if (collection.crs) throw new Error("GeoJSON must use WGS84 longitude/latitude; explicit legacy CRS is not supported");
  return collection.features.map((f: unknown) => {
    if (!f || typeof f !== "object" || !("type" in f) || f.type !== "Feature") return { values:{},problem:"Expected a GeoJSON Feature" };
    const feature = f as { properties?: unknown; geometry?: unknown; id?: unknown };
    if (!feature.properties || typeof feature.properties !== "object" || Array.isArray(feature.properties)) return {values:{},problem:"Feature properties must be an object"};
    return { values: feature.properties as Record<string,unknown>, geometry: feature.geometry, geoId:feature.id };
  });
}
export function normalizeRows(input: string, format: "csv" | "geojson", rawMapping: unknown, source: string, isDemo: boolean, now = new Date().toISOString()) {
  if (!/^[a-z0-9][a-z0-9._-]{0,79}$/i.test(source)) throw new Error("Source namespace must contain 1–80 letters, numbers, dots, underscores or hyphens");
  const mapping = mappingSchema.parse(rawMapping);
  return parseInput(input, format).map((row, index): { row: number; record?: DataCenter; error?: string; sourceId: string | null } => {
    let sourceId: string | null = null;
    try {
      if (row.problem) throw new Error(row.problem);
      const values: Record<string,string | null> = {};
      for (const field of fields) {
        const column = mapping.columns[field];
        if (column && column !== "$id" && !Object.hasOwn(row.values,column)) throw new Error(`${field}: mapped column '${column}' is missing`);
        values[field] = stringValue(column === "$id" && format === "geojson" ? row.geoId : column ? row.values[column] : null);
      }
      sourceId = values.sourceId;
      if (!sourceId || !values.name) throw new Error("sourceId and name must be nonempty");
      let latitude = numberValue(values.latitude,"latitude"); let longitude = numberValue(values.longitude,"longitude");
      if (format === "geojson") {
        if (mapping.columns.latitude || mapping.columns.longitude) throw new Error("GeoJSON uses geometry coordinates; remove latitude/longitude column mappings");
        if (row.geometry === null) { latitude = null; longitude = null; }
        else {
          const geometry = row.geometry as { type?: string; coordinates?: unknown } | undefined;
          if (geometry?.type !== "Point" || !Array.isArray(geometry.coordinates) || ![2,3].includes(geometry.coordinates.length) || geometry.coordinates.some(v => typeof v !== "number" || !Number.isFinite(v))) throw new Error("Geometry must be null or a WGS84 Point with numeric [longitude, latitude] coordinates");
          [longitude,latitude] = geometry.coordinates;
        }
      }
      const countryInput = values.countryCode ?? values.country;
      const country = countryInput ? normalizeCountry(mapping.countryAliases[countryInput] ?? countryInput) : null;
      if (values.countryCode && values.country) {
        const named = normalizeCountry(mapping.countryAliases[values.country] ?? values.country);
        if (named.code !== country!.code) throw new Error("countryCode conflicts with country name");
      }
      const power = numberValue(values.powerCapacityMw,"powerCapacityMw");
      const area = numberValue(values.facilityAreaSqM,"facilityAreaSqM");
      const status = values.status ? (mapping.statusAliases[values.status] ?? values.status).toLowerCase() : null;
      const record = dataCenterSchema.parse({
        id: `dc-${createHash("sha256").update(JSON.stringify([source,sourceId])).digest("hex").slice(0,32)}`,
        sourceId,name:values.name,operator:values.operator,countryCode:country?.code ?? null,country:country?.name ?? null,
        city:values.city,address:values.address,latitude,longitude,description:values.description,imageUrl:values.imageUrl,status,
        powerCapacityMw:power === null ? null : power / (mapping.units.power === "kW" ? 1000 : mapping.units.power === "W" ? 1000000 : 1),
        facilityAreaSqM:area === null ? null : area * (mapping.units.area === "ft2" ? 0.09290304 : 1),
        tier:values.tierLevel || values.tierCertification ? {level:values.tierLevel,certification:values.tierCertification} : null,
        pue:numberValue(values.pue,"pue"),operationalYear:numberValue(values.operationalYear,"operationalYear"),
        sourceUrl:values.sourceUrl,sourceUpdatedAt:normalizeDate(values.sourceUpdatedAt),importedAt:now,isDemo,
      });
      return { row:index+1,record,sourceId };
    } catch(error) {
      const reason = error instanceof z.ZodError ? error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join("; ") : error instanceof Error ? error.message : "Invalid row";
      return { row:index+1,error:reason,sourceId };
    }
  });
}
const comparable = (record: DataCenter) => JSON.stringify({ ...record, importedAt: "" });
export function importRecords(db: DatabaseSync, input: string, format: "csv" | "geojson", mapping: unknown, source: string, isDemo: boolean, dryRun = false): ImportReport {
  const rows = normalizeRows(input,format,mapping,source,isDemo);
  const report: ImportReport = { dryRun,inserted:0,updated:0,skipped:0,invalid:0,rows:[] };
  db.exec(dryRun ? "BEGIN" : "BEGIN IMMEDIATE");
  try {
    const existing = db.prepare("SELECT record,source_key FROM facilities").all().map(row => ({ record:dataCenterSchema.parse(JSON.parse(String(row.record))),source:String(row.source_key) }));
    const byId = new Map(existing.map(row => [row.record.id,row.record]));
    const identities = new Map<string,Set<string>>();
    const payloads = new Map<string,Set<string>>();
    for (const record of [...existing.map(r => r.record), ...rows.flatMap(r => r.record ? [r.record] : [])]) {
      const key = identityKey(record); if (!identities.has(key)) identities.set(key,new Set()); identities.get(key)!.add(record.id);
    }
    for (const {record} of rows) if (record) { if(!payloads.has(record.id)) payloads.set(record.id,new Set()); payloads.get(record.id)!.add(comparable(record)); }
    const seen = new Set<string>();
    for (const row of rows) {
      const record = row.record; let status: RowReport["status"]; let reason: string;
      if (!record) { status="invalid"; reason=row.error!; }
      else if (payloads.get(record.id)!.size > 1) { status="invalid"; reason="Conflicting rows share a source ID; resolve before importing"; }
      else if (identities.get(identityKey(record))!.size > 1) { status="invalid"; reason="Ambiguous duplicate: same name/operator/country/city has another identifier; review source IDs"; }
      else if (seen.has(record.id)) { status="skipped"; reason="Identical repeated row in this file"; }
      else if (byId.has(record.id) && byId.get(record.id)!.isDemo !== isDemo) { status="invalid"; reason="Cannot change fixture/imported classification for an existing source ID"; }
      else if (byId.has(record.id) && comparable(byId.get(record.id)!) === comparable(record)) { status="skipped"; reason="Unchanged; existing import timestamp preserved"; }
      else {
        status=byId.has(record.id) ? "updated" : "inserted"; reason=dryRun ? "Would upsert by source namespace and source ID" : "Upserted by source namespace and source ID";
        if (!dryRun) writeRecord(db,source,record);
      }
      if(record) seen.add(record.id);
      report[status]++; report.rows.push({row:row.row,sourceId:row.sourceId,status,reason});
    }
    db.exec(dryRun ? "ROLLBACK" : "COMMIT"); return report;
  } catch(error) { db.exec("ROLLBACK"); throw error; }
}
