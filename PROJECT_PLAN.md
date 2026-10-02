# Data Center Atlas

Phases 1 and 2 complete. Phase 3 has not started. All four facilities and operators
remain fictional demo data; only basemap tiles are fetched from an external service.

## Architecture and directories

Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4, shadcn/ui,
MapLibre GL JS 6.11.2, npm, and the committed dependency lockfile. Node 22+ required;
validated here with Node 26.8.1 / npm 11.19.0. System fonts avoid build-time downloads.

```text
src/app/                        Server page, loading/error boundaries, theme/CSS
src/components/layout/          Client shell; single selected-facility ID; mobile sheet
src/components/explorer/        Typed disabled filters, tags, count, list, details, states
src/components/map/             Direct client-side MapLibre integration
src/components/ui/              Shared shadcn button (preserved)
src/domain/data-center.ts       Shared data/filter contracts and coordinate validation
src/data/repository.ts          Async repository interface and response types
src/data/index.ts               Adapter selection / composition boundary
src/data/demo/                  Fictional fixtures and in-memory adapter
scripts/copy-maplibre-worker.mjs Build/dev worker asset preparation
public/maplibre/                Generated worker + shared module (ignored by Git/lint)
tests/repository.test.ts        Seven repository contract tests
```

The Server Component retrieves the demo list, options, and map features through the
repository. The client shell owns one selected ID for list/details/map. MapLibre
loads through a client-only dynamic import with SSR disabled. Presentation does
not import fixtures. Persistence will replace the adapter in `src/data/index.ts`.
No production data API or imports exist. The Creative Tim wrapper and its lint
exceptions were removed in Phase 2. No Creative Tim package was present in the
manifest; MapLibre, Lucide, and the unrelated shared shadcn dependencies remain in use.

## Data contract

`DataCenter` includes internal/source IDs, name, operator, country code/name,
city/address, latitude/longitude, description/image, status, power capacity,
area, Tier level/certification information, PUE, operational year, provenance,
import time, and explicit `isDemo`. Optional source values are represented by
required nullable fields so unknown data remains `null`, never 0 or a guessed
value. Names and internal IDs are required. Country codes use ISO alpha-2.

Coordinates use WGS84 decimal degrees: finite latitude [-90, 90] and longitude
[-180, 180]. Zero is valid. Both must be valid to create a map feature; missing,
partial, or invalid pairs remain retrievable in list/detail results. GeoJSON
uses **[longitude, latitude]**. Power is MW, area is m², PUE is dimensionless,
and operational year is a calendar year. Tier metadata is not proof of certification.
`sourceUpdatedAt` is a source-supplied ISO date/timestamp (nullable);
`importedAt` is a separate required UTC ISO timestamp. Fixtures use a fixed
creation/import timestamp and have no source update date or source URL.

`DataCenterFilters` supplies search, countryCode, city, operator, and status.
Empty/blank/null filters are unrestricted. Filters combine with AND. Text
comparison trims whitespace and ignores case. City/operator/country filters
match exactly; search is a substring across name, operator, country code/name,
city, address, and description.

`DataCenterRepository` exposes:

- `list(filters?, pagination?)`: ID-ordered records, total, page, pageSize, totalPages.
  One-based page (default 1), pageSize 1–100 (default 20); invalid inputs throw
  RangeError. Out-of-range pages are empty; zero matches means zero total pages.
- `getById(id)`: facility or null.
- `getFilterOptions(filters?)`: distinct sorted known countries, cities, operators,
  and statuses within the supplied filter scope.
- `getMapFeatures(filters?)`: lightweight GeoJSON points for **all** filtered
  matches, independent of pagination. Includes matchingCount and
  missingCoordinatesCount (also counts invalid coordinate pairs).

List and map use the same matching function. Returned records are copies so
callers cannot mutate repository state. No UI filtering is implemented yet.

## Commands

```sh
npm ci
npm run dev         # http://localhost:3000; prepares worker files automatically
npm run lint
npm run typecheck
npm test
npm run build       # prepares workers, then builds production assets
npm start           # production server after build
npm run validate    # lint + types + tests + production build
```

Dev/build use supported Webpack mode because this workspace restricts the local
worker port used by Turbopack CSS processing. Next.js must be allowed to start
local processes/ports. No API keys or application environment variables are needed.

## Completed Phase 1

Typed nullable model, filter and repository contracts; four fictional fixtures
including one without coordinates; contract tests; theme tokens and initial shell.
Theme tokens remain #050505 background, #0B0B0B sidebar, #141414 surfaces,
#262626 borders, #F5F5F5 text, #A3A3A3 secondary text, and #F97316 accent.

## Completed Phase 2

- Compact header, 380 px desktop sidebar, independently scrolling results/details,
  and a mobile collapsible bottom sheet that leaves the map and attribution visible.
- Reusable search/country/city/operator controls and active-filter tags with typed
  callbacks. Search and filters are visibly disabled with a Phase 3 explanation.
- Four selectable demo facilities; three map points. Details use “Not available”
  for unknown values; source URL/update date appear only when supplied. A facility
  without coordinates opens details without moving the camera to a guessed location.
- One selected ID synchronizes marker/list selection, detail view, and camera focus.
  Back restores the list and focus to its originating item. Map selections focus
  the detail heading. Native buttons and visible focus styles support keyboard use.
- Direct MapLibre integration with the official, unmodified OpenFreeMap Dark style:
  `https://tiles.openfreemap.org/styles/dark`. The endpoint was obtained from the
  official example's Dark button and style-selection module, then verified HTTP 200
  with a version 8 style, 47 geographic layers, vector/raster sources and glyph URL.
- Globe projection uses `map.setProjection({ type: "globe" })` after `style.load`,
  verified against MapLibre's installed types and official globe example. A guarded
  Mercator fallback reports globe unavailability; the tested setup renders globe.
- GeoJSON source `atlas-facilities` and independent `atlas-points` / `atlas-selected`
  circle layers. White base markers and orange selection leave basemap styling and
  labels intact. Clustering is deliberately off; the source can support it in Phase 3.
- Map instance survives selection/data renders; source updates use `setData`,
  selection updates a layer filter. Initialization, load timeout, resource/WebGL
  errors, retry, ResizeObserver, popup cleanup, worker and map teardown are handled.
- Hover tooltip uses text nodes (no HTML interpolation). Zoom, compass, fullscreen,
  reset and fly-to are supported. Camera animation is nonessential and uses zero
  duration when reduced motion is requested; CSS also disables transitions.
- MapLibre CSS is included globally. Current MapLibre 6 documentation explicitly
  requires **both** worker and shared module in Next.js, even with Webpack. The
  predev/prebuild script copies both from the installed version; `setWorkerUrl`
  points to the same-origin worker. Do not replace this with Vite's worker import.
- Expanded, readable OpenFreeMap/OpenMapTiles/OpenStreetMap attribution is retained.

## Phase 2 verification and limitations

- Lint passes without React rule exceptions; type checking, all seven repository
  tests, and the optimized production build pass.
- Production preview starts. Browser verification covered actual Dark tiles and
  labels, globe view, selected orange marker, list-to-map focus, marker-to-details,
  back/focus restoration, keyboard activation of the coordinate-less record,
  zoom/drag/compass/reset, fullscreen entry/exit, and 1280 px desktop / 390 px mobile.
- Mobile sheet expanded/collapsed and desktop resizing render without blank map
  regions; attribution remains visible. Disabled controls and the demo label are
  exposed in the accessibility tree. No application console errors were observed.
- Reduced-motion logic was reviewed against MapLibre's installed camera source
  (which uses prefers-reduced-motion for nonessential animations). OS preference
  switching was not simulated. Hover handling is implemented; automated pointer
  tooling did not provide an isolated hover operation.
- **Upstream style limitation:** the official Dark style references `circle-11`
  for some city/town symbols, but the official `ofm_f384/ofm.json` sprite manifest
  does not contain it. MapLibre emits a missing-image warning at some zooms. The
  basemap and labels otherwise render. No substitute icon/style was injected, to
  preserve the requested official geographic style. Recheck upstream before launch.
- The referenced composition screenshot was not attached in this session; the
  provided written layout requirements guided the implementation.
- WebGL and network access to OpenFreeMap are required. Error/timeout UI is present;
  forced offline and GPU-loss scenarios were not browser-simulated.

## Phase 3 — persistent data and complete flows (not started)

Retain **OpenFreeMap Dark + direct MapLibre**, the client-only boundary, worker
preparation, globe projection, attribution, and separate facility layers. Do not
restore Creative Tim. Connect search/filter callbacks to a shared typed filter
state and query both repository list/map methods with that same state. Add robust
pagination, dependent filter options, cluster layers as dataset size requires,
selection consistency across changing results, and end-to-end tests.

Choose persistence, implement the repository adapter, and obtain an authorized
dataset with usage/redistribution rights. Design validation, deduplication,
idempotent imports, source attribution, and separate source/import timestamps.
Finish persistent loading/error/empty states and full interaction flows. Never
promote fictional demo metrics or Tier claims into real data.

## External requirements and references

- [OpenFreeMap quick start](https://openfreemap.org/quick_start/) and
  [OpenFreeMap](https://openfreemap.org/): official style selection and attribution.
- [MapLibre installation](https://maplibre.org/maplibre-gl-js/docs/): Next.js worker
  setup, stylesheets, WebGL and CSP requirements.
- [MapLibre globe example](https://maplibre.org/maplibre-gl-js/docs/examples/display-a-globe-with-a-vector-map/): projection API.
- [Data Center Map](https://www.datacentermap.com/) remains the proposed facility
  source. No API is assumed. Obtain permission and an authorized export/feed or
  other approved access method. No records were scraped or imported.
