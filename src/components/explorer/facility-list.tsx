import { ArrowUpRight, MapPin, MapPinOff } from "lucide-react";
import { hasValidCoordinates, type DataCenter } from "@/domain/data-center";
import { EmptyState } from "./states";
export const facilityName = (name: string) => name.replace(/^Demo — /, "");
export function ResultCount({ total, mapped }: { total: number; mapped: number }) {
  return <div className="result-count"><span><strong>{total}</strong> {total === 1 ? "facility" : "facilities"}</span><span>{mapped} on map</span></div>;
}
export function FacilityList({ facilities, selectedId, onSelect }: { facilities: DataCenter[]; selectedId: string | null; onSelect: (id: string) => void }) {
  if (!facilities.length) return <EmptyState />;
  return <ul className="facility-list">{facilities.map((facility, index) => <li key={facility.id}>
    <button id={`facility-${facility.id}`} className="facility-card" aria-pressed={selectedId === facility.id} onClick={() => onSelect(facility.id)}>
      <span className="facility-index">{String(index + 1).padStart(2, "0")}</span>
      <span className="facility-summary"><span className="facility-name">{facilityName(facility.name)}</span><span className="facility-operator">{facility.operator ?? "Not available"}</span><span className="facility-location"><MapPin size={12} aria-hidden="true" />{[facility.city, facility.country].filter(Boolean).join(", ") || "Not available"}</span>{!hasValidCoordinates(facility) && <span className="location-unavailable"><MapPinOff size={12} aria-hidden="true" />Location unavailable</span>}</span>
      <ArrowUpRight size={15} aria-hidden="true" className="card-arrow" />
    </button>
  </li>)}</ul>;
}
