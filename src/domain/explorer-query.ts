import type { DataCenter, DataCenterFilters, FacilityStatus } from "./data-center";
export interface ExplorerQuery { filters: DataCenterFilters; page: number; selectedId: string | null }
const fields = ["search","countryCode","city","operator","status"] as const;
export function parseQuery(params: URLSearchParams): ExplorerQuery {
  const filters: DataCenterFilters = {};
  for (const key of fields) {
    const value = params.get(key)?.trim().slice(0,200);
    if (!value) continue;
    if (key === "status") { if (["planned","under-construction","operational","closed"].includes(value)) filters.status=value as FacilityStatus; }
    else filters[key]= key === "countryCode" ? value.toUpperCase() : value;
  }
  const page = Number(params.get("page") ?? 1);
  return { filters, page:Number.isSafeInteger(page) && page > 0 && page <= 100000 ? page : 1, selectedId:params.get("selected")?.slice(0,128) || null };
}
export function serializeQuery(query: ExplorerQuery): string {
  const params = new URLSearchParams();
  for (const key of fields) if (query.filters[key]?.trim()) params.set(key,query.filters[key]!.trim());
  if (query.page > 1) params.set("page",String(query.page));
  if (query.selectedId) params.set("selected",query.selectedId);
  return params.toString();
}
export function matchesFilters(record: DataCenter, filters: DataCenterFilters) {
  const norm = (value: string | null | undefined) => value?.trim().toLowerCase() ?? "";
  const search = norm(filters.search);
  return (!search || [record.name,record.operator,record.countryCode,record.country,record.city,record.address,record.description].some(value => norm(value).includes(search)))
    && (!norm(filters.countryCode) || norm(record.countryCode) === norm(filters.countryCode))
    && (!norm(filters.city) || norm(record.city) === norm(filters.city))
    && (!norm(filters.operator) || norm(record.operator) === norm(filters.operator))
    && (!filters.status || record.status === filters.status);
}
