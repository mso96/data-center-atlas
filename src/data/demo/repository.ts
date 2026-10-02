import { hasValidCoordinates, type DataCenter, type DataCenterFilters } from "../../domain/data-center";
import type { DataCenterRepository, Pagination, MapFeature } from "../repository";
import { demoFacilities } from "./facilities";

const normalize = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";
const distinct = (values: (string | null)[]) => [...new Set(values.filter((v): v is string => v !== null))].sort();

export class DemoDataCenterRepository implements DataCenterRepository {
  private readonly records: DataCenter[];
  constructor(records: readonly DataCenter[] = demoFacilities) {
    this.records = structuredClone([...records]).sort((a, b) => a.id.localeCompare(b.id));
  }
  private matching(filters: DataCenterFilters = {}) {
    const search = normalize(filters.search);
    return this.records.filter(record =>
      (!search || [record.name, record.operator, record.countryCode, record.country, record.city, record.address, record.description]
        .some(value => normalize(value).includes(search)))
      && (!normalize(filters.countryCode) || normalize(record.countryCode) === normalize(filters.countryCode))
      && (!normalize(filters.city) || normalize(record.city) === normalize(filters.city))
      && (!normalize(filters.operator) || normalize(record.operator) === normalize(filters.operator))
      && (!filters.status || record.status === filters.status));
  }
  async list(filters: DataCenterFilters = {}, { page = 1, pageSize = 20 }: Pagination = {}) {
    if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(pageSize) || pageSize < 1 || pageSize > 100) {
      throw new RangeError("page must be a positive safe integer; pageSize must be an integer from 1 to 100");
    }
    const records = this.matching(filters);
    return { items: structuredClone(records.slice((page - 1) * pageSize, page * pageSize)),
      total: records.length, page, pageSize, totalPages: Math.ceil(records.length / pageSize) };
  }
  async getById(id: string) {
    return structuredClone(this.records.find(record => record.id === id) ?? null);
  }
  async getFilterOptions(filters: DataCenterFilters = {}) {
    const records = this.matching(filters);
    const countries = new Map<string, string>();
    for (const record of records) {
      if (record.countryCode && record.country) countries.set(record.countryCode, record.country);
    }
    return {
      countries: [...countries].map(([code, name]) => ({ code, name })).sort((a, b) => a.name.localeCompare(b.name)),
      cities: distinct(records.map(record => record.city)),
      operators: distinct(records.map(record => record.operator)),
      statuses: [...new Set(records.flatMap(record => record.status ? [record.status] : []))].sort(),
    };
  }
  async getMapFeatures(filters: DataCenterFilters = {}) {
    const records = this.matching(filters);
    const features: MapFeature[] = records.filter(hasValidCoordinates).map(record => ({
      type: "Feature", id: record.id,
      geometry: { type: "Point", coordinates: [record.longitude, record.latitude] },
      properties: { id: record.id, name: record.name, operator: record.operator, status: record.status, isDemo: record.isDemo },
    }));
    return { type: "FeatureCollection" as const, features, matchingCount: records.length,
      missingCoordinatesCount: records.length - features.length };
  }
}
