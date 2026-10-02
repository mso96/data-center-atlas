import { Search, SlidersHorizontal, X } from "lucide-react";
import type { DataCenterFilters } from "@/domain/data-center";
import type { FilterOptions } from "@/data/repository";

export function SearchField({ value, onChange, disabled = false }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return <label className="search-field"><Search size={15} aria-hidden="true" /><input aria-label="Search facilities" aria-describedby="filter-help" placeholder="Search facilities or operators" value={value} onChange={event => onChange(event.target.value)} disabled={disabled} /></label>;
}
export function FilterControls({ value, options, onChange, disabled = false }: { value: DataCenterFilters; options: FilterOptions; onChange: (value: DataCenterFilters) => void; disabled?: boolean }) {
  return <section className="filters" aria-label="Facility filters">
    <SearchField value={value.search ?? ""} onChange={search => onChange({ ...value, search })} disabled={disabled} />
    <div className="filter-grid">{([
      ["countryCode", "Country", options.countries.map(c => ({ value: c.code, label: c.name }))],
      ["city", "City", options.cities.map(value => ({ value, label: value }))],
      ["operator", "Operator", options.operators.map(value => ({ value, label: value }))],
      ["status", "Status", options.statuses.map(value => ({ value, label: value.replaceAll("-", " ") }))],
    ] as const).map(([key, label, choices]) => <label key={key}><span>{label}</span><select aria-label={label} disabled={disabled} aria-describedby="filter-help" value={value[key] ?? ""} onChange={event => onChange({ ...value, [key]: event.target.value || null, ...(key === "countryCode" ? { city: null } : {}) })}><option value="">All {key === "countryCode" ? "countries" : key === "city" ? "cities" : key === "status" ? "statuses" : "operators"}</option>{choices.map(choice => <option key={choice.value} value={choice.value}>{choice.label}</option>)}</select></label>)}</div>
    <p id="filter-help" className="filter-help"><SlidersHorizontal size={12} aria-hidden="true" />{disabled ? "Filters unavailable while data is unavailable" : "Search and filters apply to the list and map"}</p>
  </section>;
}
export function ActiveFilterTags({ value, onRemove }: { value: DataCenterFilters; onRemove: (key: keyof DataCenterFilters) => void }) {
  const entries = Object.entries(value).filter(([, v]) => v?.trim()) as [keyof DataCenterFilters, string][];
  if (!entries.length) return null;
  return <div className="filter-tags" aria-label="Active filters">{entries.map(([key, label]) => <button key={key} onClick={() => onRemove(key)} aria-label={`Remove ${key} filter: ${label}`}>{label}<X size={12} /></button>)}</div>;
}
