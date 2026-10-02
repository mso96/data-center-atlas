/** Shared contract. All unknown values are explicit nulls, never invented zeroes. */
export type FacilityStatus = "planned" | "under-construction" | "operational" | "closed";
export type TierLevel = "I" | "II" | "III" | "IV";

export interface DataCenter {
  id: string;
  sourceId: string | null;
  name: string;
  operator: string | null;
  /** ISO 3166-1 alpha-2, uppercase when known. */
  countryCode: string | null;
  country: string | null;
  city: string | null;
  address: string | null;
  /** WGS84 decimal degrees: latitude [-90, 90], longitude [-180, 180]. */
  latitude: number | null;
  longitude: number | null;
  description: string | null;
  imageUrl: string | null;
  status: FacilityStatus | null;
  /** Megawatts (MW); null is unknown, not zero. */
  powerCapacityMw: number | null;
  /** Square meters (m²). */
  facilityAreaSqM: number | null;
  tier: { level: TierLevel | null; certification: string | null } | null;
  /** Dimensionless power usage effectiveness ratio. */
  pue: number | null;
  /** Four-digit calendar year operations began. */
  operationalYear: number | null;
  sourceUrl: string | null;
  /** Source-provided ISO 8601 date or timestamp; never the import time. */
  sourceUpdatedAt: string | null;
  /** ISO 8601 UTC timestamp when this record was imported. */
  importedAt: string;
  isDemo: boolean;
}

/** Omitted, null, or blank filters mean unrestricted. Fields combine with AND. */
export interface DataCenterFilters {
  /** Server-enforced by the public explorer; imports retain ungeolocated records. */
  mappedOnly?: boolean;
  search?: string | null;
  countryCode?: string | null;
  city?: string | null;
  operator?: string | null;
  status?: FacilityStatus | null;
}

export function hasValidCoordinates<T extends Pick<DataCenter, "latitude" | "longitude">>(
  record: T,
): record is T & { latitude: number; longitude: number } {
  const { latitude, longitude } = record;
  return typeof latitude === "number" && Number.isFinite(latitude)
    && latitude >= -90 && latitude <= 90
    && typeof longitude === "number" && Number.isFinite(longitude)
    && longitude >= -180 && longitude <= 180;
}
