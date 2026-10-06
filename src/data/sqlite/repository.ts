import { presentFacility } from "../../domain/facility-presentation";
import type { PublicFacility } from "../repository";
import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import { dataCenterSchema } from "../../domain/validation";
import type { DataCenterFilters } from "../../domain/data-center";
import type { DataCenterRepository, Pagination } from "../repository";
import { DemoDataCenterRepository } from "../demo/repository";
import { norm } from "./database";
export class SqliteDataCenterRepository implements DataCenterRepository {
  constructor(private db: DatabaseSync, private isDemo = false) {}
  private query(filters: DataCenterFilters = {}) {
    const clauses = ["is_demo=?"]; const values: SQLInputValue[] = [Number(this.isDemo)];
    if (filters.mappedOnly) clauses.push("latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180");
    if (norm(filters.search)) { clauses.push("instr(search_text,?)>0"); values.push(norm(filters.search)); }
    for (const [key, column] of [["countryCode","country_code"],["city","city"],["operator","operator"],["status","status"]] as const) {
      if (norm(filters[key])) { clauses.push(`${column}=?`); values.push(norm(filters[key])); }
    }
    return { where: clauses.join(" AND "), values };
  }
  private read(row: Record<string, unknown>): PublicFacility { const record=presentFacility(dataCenterSchema.parse(JSON.parse(String(row.record)))); return {...record, detailPath: row.detail_path ? String(row.detail_path) : undefined}; }
  async list(filters: DataCenterFilters = {}, { page = 1, pageSize = 20 }: Pagination = {}) {
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new RangeError("Invalid pagination");
    const { where, values } = this.query(filters);
    const total = Number(this.db.prepare(`SELECT count(*) AS n FROM facilities WHERE ${where}`).get(...values)!.n);
    const items = this.db.prepare(`SELECT record, (SELECT path FROM facility_routes WHERE facility_id=facilities.id) AS detail_path, EXISTS (
      SELECT 1 FROM research_profiles p JOIN research_facts f ON f.facility_id=p.facility_id
      WHERE p.facility_id=facilities.id
        AND json_extract(p.profile,'$.status')='reviewed'
        AND json_extract(f.fact,'$.status')='verified'
    ) AS source_verified FROM facilities WHERE ${where}
      ORDER BY source_verified DESC, id LIMIT ? OFFSET ?`)
      .all(...values, pageSize, (page - 1) * pageSize)
      .map(row => ({...this.read(row), ...(row.source_verified ? {sourceVerified: true} : {})}));
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
  async getById(id: string) {
    const row = this.db.prepare("SELECT record, (SELECT path FROM facility_routes WHERE facility_id=facilities.id) AS detail_path FROM facilities WHERE id=? AND is_demo=?").get(id, Number(this.isDemo));
    return row ? this.read(row) : null;
  }
  async getByPath(path: string) {
    const row=this.db.prepare("SELECT f.record, r.path AS detail_path FROM facilities f JOIN facility_routes r ON r.facility_id=f.id WHERE r.path=? AND f.is_demo=?").get(path,Number(this.isDemo));
    return row ? this.read(row) : null;
  }
  private matching(filters: DataCenterFilters) {
    const { where, values } = this.query(filters);
    return this.db.prepare(`SELECT record, (SELECT path FROM facility_routes WHERE facility_id=facilities.id) AS detail_path FROM facilities WHERE ${where} ORDER BY id`).all(...values).map(row => this.read(row));
  }
  async getFilterOptions(filters: DataCenterFilters = {}) {
    // Reuse the contract's canonical distinct/sort behavior after SQL filtering.
    return new DemoDataCenterRepository(this.matching(filters)).getFilterOptions();
  }
  async getMapFeatures(filters: DataCenterFilters = {}) {
    return new DemoDataCenterRepository(this.matching(filters)).getMapFeatures();
  }
}
