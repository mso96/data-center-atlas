import type { D1DatabaseSession } from "@cloudflare/workers-types";
import { knownText, presentFacility } from "../../domain/facility-presentation";
import { dataCenterSchema } from "../../domain/validation";
import { researchProfileSchema } from "../../domain/research/profile";
import type { DataCenterFilters, FacilityStatus } from "../../domain/data-center";
import type { DataCenterRepository, Pagination, PublicFacility, MapFeatures, MapFeature } from "../repository";

const norm = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";
const distinct = (values: (string | null)[]) => [...new Set(values.filter((v): v is string => v !== null))].sort();
const pathColumn = "(SELECT path FROM facility_routes WHERE facility_id=facilities.id) AS detail_path";
type Row = Record<string, unknown>;

/** D1 is read-only from public requests. Import/research commands stay local. */
export class D1DataCenterRepository implements DataCenterRepository {
  constructor(private db: Pick<D1DatabaseSession, "prepare" | "batch">, private isDemo = false) {}
  private query(filters: DataCenterFilters = {}) {
    const clauses = ["is_demo=?"], values: (string | number)[] = [Number(this.isDemo)];
    if (filters.mappedOnly) clauses.push("latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180");
    if (norm(filters.search)) { clauses.push("instr(search_text,?)>0"); values.push(norm(filters.search)); }
    for (const [key, column] of [["countryCode","country_code"],["city","city"],["operator","operator"],["status","status"]] as const) {
      if (norm(filters[key])) { clauses.push(`${column}=?`); values.push(norm(filters[key])); }
    }
    return { where: clauses.join(" AND "), values };
  }
  private read(row: Row): PublicFacility {
    return { ...presentFacility(dataCenterSchema.parse(JSON.parse(String(row.record)))), detailPath: row.detail_path ? String(row.detail_path) : undefined };
  }
  async list(filters: DataCenterFilters = {}, { page = 1, pageSize = 20 }: Pagination = {}) {
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new RangeError("Invalid pagination");
    const { where, values } = this.query(filters);
    const [count, rows] = await this.db.batch<Row>([
      this.db.prepare(`SELECT count(*) AS n FROM facilities WHERE ${where}`).bind(...values),
      this.db.prepare(`SELECT record, ${pathColumn}, EXISTS (
        SELECT 1 FROM research_profiles p JOIN research_facts f ON f.facility_id=p.facility_id
        WHERE p.facility_id=facilities.id AND json_extract(p.profile,'$.status')='reviewed'
          AND json_extract(f.fact,'$.status')='verified'
      ) AS source_verified FROM facilities WHERE ${where}
      ORDER BY source_verified DESC, id LIMIT ? OFFSET ?`).bind(...values, pageSize, (page - 1) * pageSize),
    ]);
    const total = Number(count.results[0].n);
    return { items: rows.results.map(row => ({...this.read(row), ...(row.source_verified ? {sourceVerified:true} : {})})), total, page, pageSize, totalPages: Math.ceil(total/pageSize) };
  }
  async getById(id: string) {
    const row = await this.db.prepare(`SELECT record, ${pathColumn} FROM facilities WHERE id=? AND is_demo=?`).bind(id, Number(this.isDemo)).first<Row>();
    return row ? this.read(row) : null;
  }
  async getByPath(path: string) {
    const row = await this.db.prepare("SELECT f.record, r.path AS detail_path FROM facilities f JOIN facility_routes r ON r.facility_id=f.id WHERE r.path=? AND f.is_demo=?").bind(path,Number(this.isDemo)).first<Row>();
    return row ? this.read(row) : null;
  }
  async getResearch(id: string) {
    const row = await this.db.prepare("SELECT profile FROM research_profiles WHERE facility_id=?").bind(id).first<{profile:string}>();
    return row ? researchProfileSchema.parse(JSON.parse(row.profile)) : null;
  }
  async getFilterOptions(filters: DataCenterFilters = {}) {
    const {where, values} = this.query(filters);
    // Only project option fields, rather than fetching thousands of full profiles.
    const {results} = await this.db.prepare(`SELECT DISTINCT
      json_extract(record,'$.countryCode') AS code, json_extract(record,'$.country') AS country,
      json_extract(record,'$.city') AS city, json_extract(record,'$.operator') AS operator, status
      FROM facilities WHERE ${where} ORDER BY id`).bind(...values).all<{code:string|null;country:string|null;city:string|null;operator:string|null;status:FacilityStatus|null}>();
    const countries = new Map<string,string>();
    for (const r of results) if(r.code && r.country) countries.set(r.code,r.country);
    return {
      countries: [...countries].map(([code,name])=>({code,name})).sort((a,b)=>a.name.localeCompare(b.name)),
      cities: distinct(results.map(r=>knownText(r.city))).filter(city=>/\p{L}/u.test(city) && !/^[+#]/.test(city.trim())),
      operators: distinct(results.map(r=>knownText(r.operator))),
      statuses: [...new Set(results.flatMap(r=>r.status ? [r.status] : []))].sort(),
    };
  }
  async getMapFeatures(filters: DataCenterFilters = {}): Promise<MapFeatures> {
    const {where,values} = this.query(filters);
    const {results} = await this.db.prepare(`SELECT id, latitude, longitude, is_demo,
      json_extract(record,'$.name') AS name, json_extract(record,'$.operator') AS operator, status
      FROM facilities WHERE ${where} ORDER BY id`).bind(...values).all<{id:string;latitude:number|null;longitude:number|null;is_demo:number;name:string;operator:string|null;status:FacilityStatus|null}>();
    const features: MapFeature[] = results.flatMap(r=>r.latitude!==null && r.longitude!==null && Number.isFinite(r.latitude) && Number.isFinite(r.longitude) && Math.abs(r.latitude)<=90 && Math.abs(r.longitude)<=180 ? [{
      type:"Feature" as const,id:r.id,geometry:{type:"Point" as const,coordinates:[r.longitude,r.latitude] as [number,number]},
      properties:{id:r.id,name:r.name,operator:knownText(r.operator),status:r.status,isDemo:Boolean(r.is_demo)},
    }] : []);
    return {type:"FeatureCollection",features,matchingCount:results.length,missingCoordinatesCount:results.length-features.length};
  }
}
