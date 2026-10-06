import Link from "next/link";
import { detailHref } from "@/domain/detail-navigation";
import { ArrowUpRight, MapPin, MapPinOff, BadgeCheck } from "lucide-react";
import { hasValidCoordinates } from "@/domain/data-center";
import type { FacilityListItem } from "@/data/repository";
import { EmptyState } from "./states";
export const facilityName = (name: string) => name.replace(/^Demo — /, "");
export function ResultCount({ total, mapped }: { total: number; mapped: number }) {
  return <div className="result-count"><span><strong>{total}</strong> {total === 1 ? "facility" : "facilities"}</span><span>{mapped} on map</span></div>;
}
export function FacilityList({ facilities, selectedId, returnQuery }: { facilities: FacilityListItem[]; selectedId: string | null; returnQuery: string }) {
  if (!facilities.length) return <EmptyState />;
  return <ul className="facility-list">{facilities.map((facility, index) => <li key={facility.id}>
    <Link prefetch={false} href={detailHref(facility,returnQuery)} id={`facility-${facility.id}`} className="facility-card" aria-current={selectedId === facility.id ? "true" : undefined}>
      <span className="facility-index">{String(index + 1).padStart(2, "0")}</span>
      <span className="facility-summary"><span className="facility-name">{facilityName(facility.name)}</span>{facility.sourceVerified && <span className="facility-verified" title="Cited profile facts have been checked. Technical specifications may still be incomplete."><BadgeCheck size={12} aria-hidden="true"/>Source-verified</span>}<span className="facility-operator">{facility.operator ?? "Not available"}</span><span className="facility-location"><MapPin size={12} aria-hidden="true" />{[facility.city, facility.country].filter(Boolean).join(", ") || "Not available"}</span>{!hasValidCoordinates(facility) && <span className="location-unavailable"><MapPinOff size={12} aria-hidden="true" />Location unavailable</span>}</span>
      <ArrowUpRight size={15} aria-hidden="true" className="card-arrow" />
    </Link>
  </li>)}</ul>;
}
