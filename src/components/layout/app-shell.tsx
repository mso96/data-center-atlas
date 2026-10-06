"use client";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, ChevronUp, Globe2 } from "lucide-react";
import type { DataCenterFilters } from "@/domain/data-center";
import type { DatasetCredit, ExplorerResult } from "@/data/explorer";
import { parseQuery,serializeQuery,type ExplorerQuery } from "@/domain/explorer-query";
import { FilterControls,ActiveFilterTags } from "@/components/explorer/filters";
import { FacilityList,ResultCount } from "@/components/explorer/facility-list";
import { FacilityDetails } from "@/components/explorer/facility-details";
import { LoadingState,ErrorState } from "@/components/explorer/states";
import { Button } from "@/components/ui/button";
const WorldMap = dynamic(() => import("@/components/map/world-map"),{ssr:false,loading:() => <LoadingState message="Preparing the map…" />});

export function AppShell({ initial }: { initial: ExplorerResult }) {
  const [result,setResult] = useState(initial);
  const [query,setQuery] = useState(initial.query);
  const [expanded,setExpanded] = useState(true);
  const [showDetails,setShowDetails] = useState(true);
  const [error,setError] = useState<string|null>(null);
  const [retry,setRetry] = useState(0);
  const queryRef = useRef(initial.query);
  const lastLoaded = useRef(serializeQuery(initial.query));
  const wantedFocus = useRef<string|null>(null);
  const queryKey = serializeQuery(query);
  useEffect(() => {
    const fromHistory = () => { const next=parseQuery(new URLSearchParams(location.search)); queryRef.current=next; setQuery(next); setShowDetails(Boolean(next.selectedId)); setError(null); };
    window.addEventListener("popstate",fromHistory);
    // Server-canonical state also normalizes invalid shared URLs on first load.
    history.replaceState(null,"",`${location.pathname}${lastLoaded.current ? `?${lastLoaded.current}` : ""}`);
    return () => window.removeEventListener("popstate",fromHistory);
  },[]);
  useEffect(() => {
    if(queryKey === lastLoaded.current && retry === 0) return;
    let active = true;
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setError(null);
      try {
        const response = await fetch(`/api/explorer?${queryKey}`,{signal:controller.signal,cache:"no-store"});
        if (!response.ok) throw new Error("Facility data could not be loaded. Please try again.");
        const next = await response.json() as ExplorerResult;
        if(!active) return;
        lastLoaded.current=serializeQuery(next.query);
        queryRef.current=next.query; setResult(next); setQuery(next.query);
        history.replaceState(null,"",`${location.pathname}${lastLoaded.current ? `?${lastLoaded.current}` : ""}`);
        if(wantedFocus.current) {
          const focusId = wantedFocus.current; wantedFocus.current=null;
          requestAnimationFrame(() => (document.getElementById(focusId) ?? document.getElementById("results-heading"))?.focus({preventScroll:true}));
        }
      } catch(e) { if(active && !(e instanceof DOMException && e.name === "AbortError")) setError(e instanceof Error ? e.message : "Request failed"); }
    }, parseQuery(new URLSearchParams(queryKey)).filters.search !== parseQuery(new URLSearchParams(lastLoaded.current)).filters.search ? 300 : 0);
    return () => { active=false; controller.abort(); window.clearTimeout(timer); };
  },[queryKey,retry]);
  const update = useCallback((change: (current: ExplorerQuery) => ExplorerQuery, push = true) => {
    const next = change(queryRef.current); const key=serializeQuery(next);
    if (key === serializeQuery(queryRef.current)) return;
    queryRef.current=next; setError(null);
    if(push) history.pushState(null,"",`${location.pathname}${key ? `?${key}` : ""}`);
    else history.replaceState(null,"",`${location.pathname}${key ? `?${key}` : ""}`);
    setQuery(next);
  },[]);
  const select = useCallback((id: string) => { wantedFocus.current="detail-title"; setShowDetails(true); setExpanded(true); requestAnimationFrame(() => document.getElementById("detail-title")?.focus({preventScroll:true})); update(current => ({...current,selectedId:id})); },[update]);
  function back() { setShowDetails(false); requestAnimationFrame(() => (document.getElementById(`facility-${query.selectedId}`) ?? document.getElementById("results-heading"))?.focus({preventScroll:true})); }
  function changeFilters(filters: DataCenterFilters) { update(current => ({...current,filters,page:1}),false); }
  const pending = queryKey !== serializeQuery(result.query);
  const selected = result.selected;
  const detailsOpen = showDetails && selected !== null;
  return <div className="atlas-shell">
    <header className="atlas-header"><Link className="wordmark" href="/" aria-label="Data Center Atlas home"><Globe2 size={20} strokeWidth={1.4} /><span>Data Center <strong>Atlas</strong></span></Link>{result.mode === "demo" && <span className="demo-pill"><span />Demo data</span>}</header>
    <div className={`atlas-workspace ${expanded ? "sheet-expanded" : "sheet-collapsed"}`}>
      <aside className="explorer" aria-label="Facility explorer">
        <button className="sheet-toggle" aria-expanded={expanded} aria-controls="explorer-content" onClick={() => setExpanded(value => !value)}><span className="sheet-grip" /><span>{detailsOpen ? "Facility details" : `${result.page.total} ${result.page.total === 1 ? "facility" : "facilities"}`}</span>{expanded ? <ChevronDown size={16} /> : <ChevronUp size={16} />}</button>
        <div id="explorer-content" className="explorer-content" aria-busy={pending}>
          {error && <ErrorState message={error} onRetry={() => setRetry(value => value+1)} />}
          <div className="results-view" hidden={detailsOpen}>
            <div className="explorer-intro"><p className="eyebrow">EXPLORE THE ATLAS</p><h1 id="results-heading" tabIndex={-1}>Discover data centers</h1><p>Explore data center locations, operators, and infrastructure worldwide.</p></div>
            <FilterControls value={query.filters} options={result.options} onChange={changeFilters} />
            <ActiveFilterTags value={query.filters} onRemove={key => changeFilters({...query.filters,[key]:null,...(key === "countryCode" ? {city:null} : {})})} />
            {Object.entries(query.filters).some(([key,value]) => key !== "mappedOnly" && Boolean(value)) && <button className="clear-filters" onClick={() => changeFilters({})}>Clear all filters</button>}
            <ResultCount total={result.page.total} mapped={result.features.features.length} />
            {!!result.features.missingCoordinatesCount && <p className="unmapped-count">{result.features.missingCoordinatesCount} {result.features.missingCoordinatesCount === 1 ? "facility has" : "facilities have"} no valid coordinates and {result.features.missingCoordinatesCount === 1 ? "is" : "are"} not mapped.</p>}
            <div className="results-scroll" inert={pending || !!error}>{pending && <LoadingState message="Updating results…" />}<FacilityList facilities={result.page.items} selectedId={query.selectedId} returnQuery={queryKey} /></div>
            {result.page.totalPages > 1 && <nav className="pagination" aria-label="Results pages"><Button variant="outline" size="sm" disabled={pending || result.page.page === 1} onClick={() => update(current => ({...current,page:current.page-1}))}>Previous</Button><span>Page {result.page.page} of {result.page.totalPages}</span><Button variant="outline" size="sm" disabled={pending || result.page.page >= result.page.totalPages} onClick={() => update(current => ({...current,page:current.page+1}))}>Next</Button></nav>}
            <ExplorerFooter dataset={result.dataset} mode={result.mode} />
          </div>
          {detailsOpen && selected && <div className="details-scroll">{pending && <LoadingState message="Updating facility…" />}<FacilityDetails facility={selected} onBack={back} returnQuery={queryKey} /><ExplorerFooter dataset={result.dataset} mode={result.mode} /></div>}
        </div>
      </aside>
      <main className="map-region" aria-label="Data center world map"><WorldMap features={result.features} selected={selected} onSelect={select} />{(pending || error) && <div className="map-pending" aria-live="polite">{error ? "Map shows the last successful results" : "Updating list and map…"}</div>}</main>
    </div>
    <span className="sr-only" role="status" aria-live="polite">{selected ? `${selected.name} selected` : `${result.page.total} matching facilities`}</span>
  </div>;
}

function ExplorerFooter({ dataset, mode }: { dataset: DatasetCredit | null; mode: ExplorerResult["mode"] }) {
  return <footer className="explorer-footer">
    {dataset ? <div className="dataset-credit"><a href={dataset.url} target="_blank" rel="noreferrer">{dataset.label}</a><p>{dataset.notice}</p></div> : <p>{mode === "demo" ? "Illustrative locations. Fictional facilities." : "See each facility’s source."}</p>}
    <p className="builder-credit">Built by <a href="https://twitter.com/msefaoruc" target="_blank" rel="noreferrer">Sefa Oruc</a><span aria-hidden="true"> · </span>marketing engineer &amp; indie app builder<span aria-hidden="true"> · </span><a href="https://sefaoruc.com/" target="_blank" rel="noreferrer">sefaoruc.com</a></p>
  </footer>;
}
