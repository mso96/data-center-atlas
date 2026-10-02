import { ArrowLeft, ExternalLink, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasValidCoordinates, type DataCenter } from "@/domain/data-center";
import { facilityName } from "./facility-list";
const unavailable = "Not available";
const quantity = (value: number | null, unit: string) => value === null ? unavailable : `${value.toLocaleString("en-US")} ${unit}`;
export function FacilityDetails({ facility, onBack }: { facility: DataCenter; onBack: () => void }) {
  const fields = [
    ["Operator", facility.operator], ["Country", facility.country], ["Country code", facility.countryCode], ["City", facility.city], ["Address", facility.address],
    ["Status", facility.status?.replaceAll("-", " ")], ["Power capacity", quantity(facility.powerCapacityMw, "MW")], ["Facility area", quantity(facility.facilityAreaSqM, "m²")],
    ["Tier", facility.tier?.level], ["Certification", facility.tier?.certification], ["PUE", facility.pue], ["Operational since", facility.operationalYear],
    ["Latitude", facility.latitude], ["Longitude", facility.longitude], ["Internal ID", facility.id], ["Source ID", facility.sourceId],
    ["Imported", facility.importedAt],
  ];
  return <div className="facility-details">
    <Button id="details-back" className="back-button" variant="ghost" size="sm" onClick={onBack}><ArrowLeft size={14} />All facilities</Button>
    <div className="detail-heading"><p className="eyebrow">FACILITY OVERVIEW</p><h2 tabIndex={-1} id="detail-title">{facilityName(facility.name)}</h2><p>{[facility.city, facility.country].filter(Boolean).join(", ") || unavailable}</p><span className="demo-pill">{facility.isDemo ? "Fictional demo facility" : "Imported facility"}</span></div>
    {!hasValidCoordinates(facility) && <p className="location-notice"><MapPinOff size={16} />Location unavailable. This facility cannot be shown on the map.</p>}
    <section className="detail-section"><h3>About this facility</h3><p>{facility.description ?? unavailable}</p></section>
    <dl className="detail-fields">{fields.map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{value ?? unavailable}</dd></div>)}</dl>
    {facility.imageUrl && <a className="source-link" href={facility.imageUrl} target="_blank" rel="noreferrer">Facility image<ExternalLink size={12} /></a>}
    {facility.sourceUrl && <a className="source-link" href={facility.sourceUrl} target="_blank" rel="noreferrer">View source<ExternalLink size={12} /></a>}
    {facility.sourceUpdatedAt && <p className="source-date">Source updated: {facility.sourceUpdatedAt}</p>}
  </div>;
}
