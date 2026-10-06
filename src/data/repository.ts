import type { DataCenter, DataCenterFilters, FacilityStatus } from "../domain/data-center";

export interface Pagination {
  /** One-based; defaults to 1. */
  page?: number;
  /** Integer 1–100; defaults to 20. Invalid pagination throws RangeError. */
  pageSize?: number;
}
export type PublicFacility = DataCenter & { detailPath?: string };
export type FacilityListItem = PublicFacility & {
  /** Derived from completed research with verified facts; never imported as a source claim. */
  sourceVerified?: boolean;
};
export interface FacilityPage {
  items: FacilityListItem[];
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
  /** Source-verified profiles first, then stable internal ID within each group.
   * Demo records have no research verification. Search is case-insensitive substring matching. */
  list(filters?: DataCenterFilters, pagination?: Pagination): Promise<FacilityPage>;
  getById(id: string): Promise<PublicFacility | null>;
  getByPath(path: string): Promise<PublicFacility | null>;
  /** Distinct sorted values within the supplied filters; unknowns excluded. */
  getFilterOptions(filters?: DataCenterFilters): Promise<FilterOptions>;
  /** All matching geolocated records, independent of list pagination. */
  getMapFeatures(filters?: DataCenterFilters): Promise<MapFeatures>;
}
