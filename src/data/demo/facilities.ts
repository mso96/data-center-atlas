import type { DataCenter } from "../../domain/data-center";

// Entirely fictional facilities/operators. City-center coordinates are illustrative.
// Fixed fixture import time keeps builds deterministic; these are not source updates.
const empty: Omit<DataCenter, "id" | "name"> = {
  sourceId: null, operator: null, countryCode: null, country: null, city: null,
  address: null, latitude: null, longitude: null, description: null, imageUrl: null,
  status: null, powerCapacityMw: null, facilityAreaSqM: null, tier: null,
  pue: null, operationalYear: null, sourceUrl: null, sourceUpdatedAt: null,
  importedAt: "2026-10-02T00:00:00.000Z", isDemo: true,
};
export const demoFacilities: readonly DataCenter[] = [
  { ...empty, id: "demo-001", name: "Demo — Ember Quay", operator: "Fictional Ember Compute",
    countryCode: "GB", country: "United Kingdom", city: "London", latitude: 51.5074, longitude: -0.1278,
    description: "Fictional demo facility. Coordinates indicate a city, not a real facility.",
    status: "operational", powerCapacityMw: 12, facilityAreaSqM: 8000, pue: 1.3, operationalYear: 2022,
    tier: { level: "III", certification: "Fictional demo claim; not certified" } },
  { ...empty, id: "demo-002", name: "Demo — Lantern Harbour", operator: "Fictional Lantern Systems",
    countryCode: "SG", country: "Singapore", city: "Singapore", latitude: 1.3521, longitude: 103.8198,
    status: "planned", powerCapacityMw: 18 },
  { ...empty, id: "demo-003", name: "Demo — Copper Horizon", operator: "Fictional Ember Compute",
    countryCode: "US", country: "United States", city: "Phoenix", latitude: 33.4484, longitude: -112.074,
    status: "under-construction", facilityAreaSqM: 15000 },
  { ...empty, id: "demo-004", name: "Demo — Paper Aurora", operator: "Fictional Aurora Works",
    countryCode: "FI", country: "Finland", city: "Helsinki",
    description: "Fictional demo record with unknown coordinates and facility specifications." },
];
