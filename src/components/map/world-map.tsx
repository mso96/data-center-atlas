"use client";

import { useEffect, useRef, useState } from "react";
import { Map as LibreMap, NavigationControl, FullscreenControl, AttributionControl, Popup, setWorkerUrl, type GeoJSONSource, type MapLayerMouseEvent } from "maplibre-gl";
import { RotateCcw } from "lucide-react";
import type { DatasetCredit } from "@/data/explorer";
import type { MapFeatures } from "@/data/repository";
import { hasValidCoordinates, type DataCenter } from "@/domain/data-center";
import { Button } from "@/components/ui/button";
import { LoadingState, ErrorState } from "@/components/explorer/states";

// Verified against the Dark button in https://openfreemap.org/quick_start/.
export const DARK_STYLE = "https://tiles.openfreemap.org/styles/dark";
const INITIAL_VIEW = { center: [15, 22] as [number, number], zoom: 1.4, bearing: 0, pitch: 0 };
const SOURCE = "atlas-facilities";
const POINTS = "atlas-points";
const SELECTED = "atlas-selected";
const SELECTED_SOURCE = "atlas-selected-source";
const CLUSTERS = "atlas-clusters";
const motionDuration = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : 1200;

export default function WorldMap({ features, selected, onSelect, mode, dataset }: { features: MapFeatures; selected: DataCenter | null; onSelect: (id: string) => void; mode: "demo" | "imported"; dataset: DatasetCredit | null }) {
  const container = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LibreMap | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [projection, setProjection] = useState("Globe");

  useEffect(() => {
    if (!container.current) return;
    setWorkerUrl("/maplibre/maplibre-gl-worker.mjs");
    let map: LibreMap;
    let disposed = false;
    let hasLoaded = false;
    let popup: Popup | null = null;
    const timer = window.setTimeout(() => {
      if (!disposed && !hasLoaded) setError("The map is taking longer than expected. Check your connection and retry.");
    }, 25000);
    try {
      map = new LibreMap({ container: container.current, style: DARK_STYLE, ...INITIAL_VIEW,
        attributionControl: false, maxZoom: 18, minZoom: 0.5 });
    } catch {
      window.clearTimeout(timer);
      // Defer React notification from the imperative initializer.
      queueMicrotask(() => { if (!disposed) setError("WebGL could not start. Try a browser with hardware acceleration enabled."); });
      return () => { disposed = true; };
    }
    mapRef.current = map;
    map.addControl(new NavigationControl({ visualizePitch: true }), "top-right");
    map.addControl(new FullscreenControl({ container: frame.current ?? undefined }), "top-right");
    map.addControl(new AttributionControl({ compact: false }), "bottom-right");
    map.getCanvas().setAttribute("aria-label", "Interactive world map. Use arrow keys to pan, plus and minus to zoom. Select facilities from the list for keyboard access.");

    map.on("style.load", () => {
      try { map.setProjection({ type: "globe" }); }
      catch { map.setProjection({ type: "mercator" }); setProjection("World map · globe unavailable"); }
      map.addSource(SOURCE, { type: "geojson", data: { type: "FeatureCollection", features: [] }, cluster: true, clusterMaxZoom: 14, clusterRadius: 45 });
      map.addLayer({ id: CLUSTERS, type: "circle", source: SOURCE, filter: ["has", "point_count"],
        paint: { "circle-color": "#262626", "circle-radius": ["step", ["get", "point_count"], 18, 100, 23, 1000, 29], "circle-stroke-color": "#A3A3A3", "circle-stroke-width": 1 } });
      map.addLayer({ id: "atlas-cluster-count", type: "symbol", source: SOURCE, filter: ["has", "point_count"],
        layout: { "text-field": "{point_count_abbreviated}", "text-font": ["Noto Sans Regular"], "text-size": 12 }, paint: { "text-color": "#F5F5F5" } });
      map.addSource(SELECTED_SOURCE, { type: "geojson", data: {type:"FeatureCollection",features:[]} });
      map.addLayer({ id: POINTS, type: "circle", source: SOURCE, filter: ["!", ["has", "point_count"]],
        paint: { "circle-radius": 6, "circle-color": "#F5F5F5", "circle-stroke-width": 2, "circle-stroke-color": "#050505" } });
      map.addLayer({ id: SELECTED, type: "circle", source: SELECTED_SOURCE,
        paint: { "circle-radius": 9, "circle-color": "#F97316", "circle-stroke-width": 5, "circle-stroke-color": "#F97316", "circle-stroke-opacity": 0.22 } });
    });
    map.on("load", () => {
      hasLoaded = true; window.clearTimeout(timer); setReady(true); setError(null);
    });
    map.on("error", () => {
      if (!disposed) setError("Some map resources could not load. Check your connection, then retry the map.");
    });
    map.on("idle", () => { if (hasLoaded && map.areTilesLoaded()) setError(null); });
    map.on("webglcontextlost", () => setError("The map graphics context was interrupted. Retry to restore the map."));
    const click = (event: MapLayerMouseEvent) => {
      const id = event.features?.[0]?.properties?.id;
      if (typeof id === "string") { popup?.remove(); onSelect(id); }
    };
    const hover = (event: MapLayerMouseEvent) => {
      map.getCanvas().style.cursor = "pointer";
      const feature = event.features?.[0];
      if (!feature || feature.geometry.type !== "Point") return;
      popup?.remove();
      const content = document.createElement("div");
      const title = document.createElement("strong");
      title.textContent = String(feature.properties?.name ?? "Facility").replace(/^Demo — /, "");
      const operator = document.createElement("span");
      operator.textContent = String(feature.properties?.operator ?? "Not available");
      content.append(title, operator);
      popup = new Popup({ closeButton: false, closeOnClick: true, offset: 12, className: "atlas-tooltip" })
        .setLngLat(feature.geometry.coordinates as [number, number]).setDOMContent(content).addTo(map);
    };
    map.on("click", POINTS, click);
    map.on("click", SELECTED, click);
    map.on("click", CLUSTERS, async event => {
      const feature = event.features?.[0];
      if (!feature || feature.geometry.type !== "Point") return;
      try {
        const zoom = await map.getSource<GeoJSONSource>(SOURCE)!.getClusterExpansionZoom(Number(feature.properties.cluster_id));
        if(!disposed) map.easeTo({center:feature.geometry.coordinates as [number,number],zoom,duration:motionDuration(),essential:false});
      } catch { if(!disposed) setError("This cluster changed. Try selecting it again."); }
    });
    map.on("mouseenter", CLUSTERS, () => { map.getCanvas().style.cursor="pointer"; });
    map.on("mouseleave", CLUSTERS, () => { map.getCanvas().style.cursor=""; });
    map.on("mouseenter", POINTS, hover);
    map.on("mouseleave", POINTS, () => { map.getCanvas().style.cursor = ""; popup?.remove(); });
    const escape = (event: KeyboardEvent) => { if (event.key === "Escape") popup?.remove(); };
    map.getCanvas().addEventListener("keydown", escape);
    const observer = new ResizeObserver(() => map.resize());
    observer.observe(container.current);
    return () => {
      disposed = true; window.clearTimeout(timer); observer.disconnect(); popup?.remove();
      map.getCanvas().removeEventListener("keydown", escape);
      map.remove(); mapRef.current = null;
    };
  }, [onSelect, attempt]);

  useEffect(() => {
    const source = mapRef.current?.getSource<GeoJSONSource>(SOURCE);
    if (ready && source) source.setData({ type: "FeatureCollection", features: features.features });
  }, [features, ready]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ready || !map.getLayer(SELECTED)) return;
    map.getSource<GeoJSONSource>(SELECTED_SOURCE)?.setData({ type:"FeatureCollection", features: selected && hasValidCoordinates(selected) ? [{ type:"Feature",id:selected.id,geometry:{type:"Point",coordinates:[selected.longitude,selected.latitude]},properties:{id:selected.id,name:selected.name,operator:selected.operator} }] : [] });
  }, [selected, ready]);

  const selectedId = selected?.id;
  const longitude = selected?.longitude;
  const latitude = selected?.latitude;
  useEffect(() => {
    if (!ready || !selectedId || longitude == null || latitude == null) return;
    mapRef.current?.flyTo({center:[longitude,latitude],zoom:7,duration:motionDuration(),essential:false});
  }, [selectedId, longitude, latitude, ready]);

  function reset() { mapRef.current?.flyTo({ ...INITIAL_VIEW, duration: motionDuration(), essential: false }); }
  function retry() { setReady(false); setError(null); setAttempt(value => value + 1); }

  return <div className="map-frame" ref={frame}>
    <div className="map-canvas" ref={container} />
    <div className="map-caption"><span className="eyebrow">GLOBAL INFRASTRUCTURE</span><span>{projection} overview</span></div>
    <Button className="reset-map" variant="outline" size="sm" onClick={reset} disabled={!ready} aria-label="Reset to global view"><RotateCcw size={13} />Global view</Button>
    {!ready && !error && <div className="map-message"><LoadingState message="Loading world map…" /></div>}
    {error && <div className="map-message"><ErrorState message={error} onRetry={retry} /></div>}
    {dataset && <div className="dataset-credit"><a href={dataset.url} target="_blank" rel="noreferrer">{dataset.label}</a><span>{dataset.notice}</span></div>}
    <div className="map-legend"><span className="legend-dot" />{mode === "demo" ? "Demo data" : "Imported data"}<span className="legend-divider" />{features.features.length} mapped</div>
  </div>;
}
