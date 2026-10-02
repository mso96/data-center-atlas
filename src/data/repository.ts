import type { DataCenter, DataCenterFilters, FacilityStatus } from "../domain/data-center";

export interface Pagination {
  /** One-based; defaults to 1. */
  page?: number;
  /** Integer 1–100; defaults to 20. Invalid pagination throws RangeError. */
  pageSize?: number;
}
export interface FacilityPage {
  items: DataCenter[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}
export interface FilterOptions {
  countries: { code: string; name: string }[];
  cities: string[];
  operators: string[];
  statuses: FacilityStatus[];
}
export interface MapFeature {
  type: "Feature";
  id: string;
  geometry: { type: "Point"; /** GeoJSON order: [longitude, latitude]. */ coordinates: [number, number] };
  properties: Pick<DataCenter, "id" | "name" | "operator" | "status" | "isDemo">;
}
export interface MapFeatures {
  type: "FeatureCollection";
  features: MapFeature[];
  /** All matches, including records that cannot be placed on the map. */
  matchingCount: number;
  missingCoordinatesCount: number;
}
export interface DataCenterRepository {
  /** Stable order by internal ID. Search is case-insensitive substring matching. */
  list(filters?: DataCenterFilters, pagination?: Pagination): Promise<FacilityPage>;
  getById(id: string): Promise<DataCenter | null>;
  /** Distinct sorted values within the supplied filters; unknowns excluded. */
  getFilterOptions(filters?: DataCenterFilters): Promise<FilterOptions>;
  /** All matching geolocated records, independent of list pagination. */
  getMapFeatures(filters?: DataCenterFilters): Promise<MapFeatures>;
}
