import type { DatabaseSync, SQLInputValue } from "node:sqlite";
import { dataCenterSchema } from "../../domain/validation";
import type { DataCenter, DataCenterFilters } from "../../domain/data-center";
import type { DataCenterRepository, Pagination } from "../repository";
import { DemoDataCenterRepository } from "../demo/repository";
import { norm } from "./database";
export class SqliteDataCenterRepository implements DataCenterRepository {
  constructor(private db: DatabaseSync, private isDemo = false) {}
  private query(filters: DataCenterFilters = {}) {
    const clauses = ["is_demo=?"]; const values: SQLInputValue[] = [Number(this.isDemo)];
    if (norm(filters.search)) { clauses.push("instr(search_text,?)>0"); values.push(norm(filters.search)); }
    for (const [key, column] of [["countryCode","country_code"],["city","city"],["operator","operator"],["status","status"]] as const) {
      if (norm(filters[key])) { clauses.push(`${column}=?`); values.push(norm(filters[key])); }
    }
    return { where: clauses.join(" AND "), values };
  }
  private read(row: Record<string, unknown>): DataCenter { return dataCenterSchema.parse(JSON.parse(String(row.record))); }
  async list(filters: DataCenterFilters = {}, { page = 1, pageSize = 20 }: Pagination = {}) {
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) throw new RangeError("Invalid pagination");
    const { where, values } = this.query(filters);
    const total = Number(this.db.prepare(`SELECT count(*) AS n FROM facilities WHERE ${where}`).get(...values)!.n);
    const items = this.db.prepare(`SELECT record FROM facilities WHERE ${where} ORDER BY id LIMIT ? OFFSET ?`).all(...values, pageSize, (page - 1) * pageSize).map(row => this.read(row));
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
  async getById(id: string) {
    const row = this.db.prepare("SELECT record FROM facilities WHERE id=? AND is_demo=?").get(id, Number(this.isDemo));
    return row ? this.read(row) : null;
  }
  private matching(filters: DataCenterFilters) {
    const { where, values } = this.query(filters);
    return this.db.prepare(`SELECT record FROM facilities WHERE ${where} ORDER BY id`).all(...values).map(row => this.read(row));
  }
  async getFilterOptions(filters: DataCenterFilters = {}) {
    // Reuse the contract's canonical distinct/sort behavior after SQL filtering.
    return new DemoDataCenterRepository(this.matching(filters)).getFilterOptions();
  }
  async getMapFeatures(filters: DataCenterFilters = {}) {
    return new DemoDataCenterRepository(this.matching(filters)).getMapFeatures();
  }
}
