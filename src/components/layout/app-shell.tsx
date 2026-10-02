"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useState } from "react";
import { ChevronDown, ChevronUp, Globe2 } from "lucide-react";
import type { DataCenter, DataCenterFilters } from "@/domain/data-center";
import type { FilterOptions, MapFeatures } from "@/data/repository";
import { FilterControls, ActiveFilterTags } from "@/components/explorer/filters";
import { FacilityList, ResultCount } from "@/components/explorer/facility-list";
import { FacilityDetails } from "@/components/explorer/facility-details";
import { LoadingState } from "@/components/explorer/states";
const WorldMap = dynamic(() => import("@/components/map/world-map"), { ssr: false, loading: () => <LoadingState message="Preparing the map…" /> });

export function AppShell({ facilities, options, features }: { facilities: DataCenter[]; options: FilterOptions; features: MapFeatures }) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);
  const [filters, setFilters] = useState<DataCenterFilters>({});
  const selected = facilities.find(facility => facility.id === selectedId) ?? null;
  const select = useCallback((id: string) => {
    setSelectedId(id); setExpanded(true);
    requestAnimationFrame(() => document.getElementById("detail-title")?.focus({ preventScroll: true }));
  }, []);
  function back() {
    const previous = selectedId; setSelectedId(null);
    requestAnimationFrame(() => document.getElementById(`facility-${previous}`)?.focus({ preventScroll: true }));
  }
  return <div className="atlas-shell">
    <header className="atlas-header"><Link className="wordmark" href="/" aria-label="Data Center Atlas home"><Globe2 size={20} strokeWidth={1.4} /><span>Data Center <strong>Atlas</strong></span></Link><div className="header-meta"><span className="header-subtitle">A world of infrastructure</span><span className="demo-pill"><span />Demo data</span></div></header>
    <div className={`atlas-workspace ${expanded ? "sheet-expanded" : "sheet-collapsed"}`}>
      <aside className="explorer" aria-label="Facility explorer">
        <button className="sheet-toggle" aria-expanded={expanded} aria-controls="explorer-content" onClick={() => setExpanded(value => !value)}><span className="sheet-grip" /><span>{selected ? "Facility details" : `${facilities.length} demo facilities`}</span>{expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</button>
        <div id="explorer-content" className="explorer-content">
          <div className="results-view" hidden={selected !== null}>
            <div className="explorer-intro"><p className="eyebrow">EXPLORE THE ATLAS</p><h1>Find your next connection.</h1><p>Discover the places powering our digital world.</p></div>
            <FilterControls value={filters} options={options} onChange={setFilters} disabled />
            <ActiveFilterTags value={filters} onRemove={key => setFilters(current => ({ ...current, [key]: null }))} />
            <ResultCount total={facilities.length} mapped={features.features.length} />
            <div className="results-scroll"><FacilityList facilities={facilities} selectedId={selectedId} onSelect={select} /></div>
            <footer className="explorer-footer"><span className="tiny-dot" />Illustrative locations. Fictional facilities.</footer>
          </div>
          {selected && <div className="details-scroll"><FacilityDetails facility={selected} onBack={back} /></div>}
        </div>
      </aside>
      <main className="map-region" aria-label="Data center world map"><WorldMap features={features} selected={selected} onSelect={select} /></main>
    </div>
    <span className="sr-only" role="status" aria-live="polite">{selected ? `${selected.name} selected` : "Showing all demo facilities"}</span>
  </div>;
}
