import { ArrowLeft, ExternalLink, MapPinOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { hasValidCoordinates, type DataCenter } from "@/domain/data-center";
import { facilityName } from "./facility-list";

const quantity = (value: number | null, unit: string) => value === null ? null : `${value.toLocaleString("en-US")} ${unit}`;
const statusLabels = { planned: "Planned", "under-construction": "Under construction", operational: "Operational", closed: "Closed" };

export function FacilityDetails({ facility, onBack }: { facility: DataCenter; onBack: () => void }) {
  const isRingmast4r = Boolean(facility.sourceUrl?.startsWith("https://github.com/Ringmast4r/Global-Data-Center-Map/"));
  const location = [facility.city, facility.country].filter(Boolean).join(", ");
  // The Ringmast4r adapter's description is provenance, not a facility biography.
  const description = isRingmast4r ? null : facility.description;
  const fields = [
    ["Operator", facility.operator], ["Address", facility.address],
    ["Power capacity", quantity(facility.powerCapacityMw, "MW")],
    ["Facility area", quantity(facility.facilityAreaSqM, "m²")],
    ["Tier", facility.tier?.level], ["Certification", facility.tier?.certification],
    ["PUE", facility.pue], ["Operational since", facility.operationalYear],
  ].filter(([, value]) => value !== null && value !== undefined && value !== "");

  return <div className="facility-details">
    <Button id="details-back" className="back-button" variant="ghost" size="sm" onClick={onBack}><ArrowLeft size={14} />All facilities</Button>
    <div className="detail-heading">
      <p className="eyebrow">FACILITY</p>
      <h2 tabIndex={-1} id="detail-title">{facilityName(facility.name)}</h2>
      {location && <p>{location}</p>}
      <div className="detail-badges">
        {facility.status && <span className="demo-pill" title="Status reported by the source">{statusLabels[facility.status]}</span>}
        {facility.isDemo && <span className="demo-pill">Fictional demo facility</span>}
      </div>
    </div>
    {fields.length > 0 && <dl className="detail-fields">{fields.map(([label, value]) => <div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>}
    {description && <section className="detail-section"><h3>About this facility</h3><p>{description}</p></section>}
    {!hasValidCoordinates(facility) && <p className="location-notice"><MapPinOff size={16} />No map location provided.</p>}
    {facility.imageUrl && <a className="source-link" href={facility.imageUrl} target="_blank" rel="noreferrer">Facility image<ExternalLink size={12} /></a>}
    {(facility.sourceUrl || isRingmast4r) && <section className="detail-source" aria-label="Data source">
      {facility.sourceUrl && <a className="source-link" href={facility.sourceUrl} target="_blank" rel="noreferrer">{isRingmast4r ? "Data centers © Ringmast4r" : "View source"}<ExternalLink size={12} /></a>}
      {isRingmast4r && <p>Global-Data-Center-Map. Limited source information; mapped locations may be approximate.</p>}
      {facility.sourceUpdatedAt && <p>Source updated: {facility.sourceUpdatedAt}</p>}
    </section>}
  </div>;
}
