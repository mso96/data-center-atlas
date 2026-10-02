import type { DataCenterRepository, FacilityPage, FilterOptions, MapFeatures } from "./repository";
import { matchesFilters, type ExplorerQuery } from "../domain/explorer-query";
import type { DataCenter } from "../domain/data-center";
export interface DatasetCredit { label: string; url: string; notice: string }
export interface ExplorerResult {
  dataset: DatasetCredit | null;
  query: ExplorerQuery; page: FacilityPage; options: FilterOptions; features: MapFeatures;
  selected: DataCenter | null; mode: "demo" | "imported";
}
export async function loadExplorer(repository: DataCenterRepository, query: ExplorerQuery, mode: "demo"|"imported"): Promise<ExplorerResult> {
  const globalOptions = await repository.getFilterOptions({mappedOnly:true});
  const scopedOptions = query.filters.countryCode ? await repository.getFilterOptions({countryCode:query.filters.countryCode,mappedOnly:true}) : globalOptions;
  const filters = {...query.filters,mappedOnly:true};
  if (filters.city && !scopedOptions.cities.some(city => city.toLowerCase() === filters.city!.toLowerCase())) delete filters.city;
  let page = await repository.list(filters,{page:query.page,pageSize:20});
  if(page.page > Math.max(1,page.totalPages)) page = await repository.list(filters,{page:Math.max(1,page.totalPages),pageSize:20});
  const features = await repository.getMapFeatures(filters);
  const candidate = query.selectedId ? await repository.getById(query.selectedId) : null;
  const selected = candidate && matchesFilters(candidate,filters) ? candidate : null;
  return { dataset: mode === "imported" && process.env.ATLAS_DATASET === "ringmast4r" ? { label:"Data centers (c) Ringmast4r — Global-Data-Center-Map", url:"https://github.com/Ringmast4r/Global-Data-Center-Map", notice:"Locations are approximate and may be city or regional centroids." } : null, query:{filters,page:page.page,selectedId:selected?.id ?? null},page,features,selected,mode,
    options:{...globalOptions,cities:scopedOptions.cities} };
}
