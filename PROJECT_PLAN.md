# Data Center Atlas

Phase 1 foundation only. All four facilities and operators are fictional demo data.

## Architecture

Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4, shadcn/ui,
and npm with a committed `package-lock.json`. Node 22+ is required; this workspace
was validated with Node 26.8.1 and npm 11.19.0. System fonts avoid build-time font downloads.

```text
src/app/                         Server-rendered home page, metadata, theme tokens
src/components/layout/           Minimal full-height application shell
src/components/ui/               Installed shadcn button and Creative Tim map source
src/domain/data-center.ts        Facility/filter contracts and coordinate validation
src/data/repository.ts           Async repository interface and response contracts
src/data/index.ts                Adapter selection / composition boundary
src/data/demo/                   Fictional fixtures and in-memory repository
src/lib/utils.ts                 shadcn class-name utility
tests/repository.test.ts        Repository contract tests
```

The home Server Component reads only the repository interface and passes a count
to the shell. Presentation never imports fixtures. Replace the adapter in
`src/data/index.ts` when persistence is introduced; no database, HTTP API,
ingestion, or map requests are active in Phase 1.

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

Run these from this project directory:

```sh
npm ci
npm run dev                 # http://localhost:3000
npm run typecheck
npm run lint
npm test
npm run build
npm start                   # production server after build
npm run validate            # lint, type checking, tests, production build
```

The dev/build scripts use the supported Webpack bundler because Turbopack CSS
processing cannot bind its worker port in this workspace.
Restricted environments must permit Next.js to spawn local processes and bind
local ports. No application environment variables or API credentials are needed
for Phase 1.

## Completed Phase 1

- New application and dependency lockfile; shared nullable data/filter contracts.
- Replaceable typed repository and four explicitly fictional facilities, one
  without coordinates; tests for filtering, pagination, provenance, coordinate
  boundaries, map/list synchronization, options, and mutation isolation.
- Compact header, sidebar placeholder, map placeholder, visible Demo data label.
- Reusable theme tokens: background #050505, sidebar #0B0B0B, elevated #141414,
  border #262626, primary text #F5F5F5, secondary text #A3A3A3, accent #F97316.
- Creative Tim map installed with `npx @creative-tim/ui@0.4.2 add map --yes`.
  Its `use client` boundary and MapLibre CSS are present. The module is neither
  imported nor mounted by the shell, so no map rendering/tile fetching occurs.

## Phase 2 — visual interface and map (not started)

Use the layout reference to design the detailed explorer and responsive map.
The referenced screenshot was not available in this session; obtain it before
matching its details. Add accessible search/filter controls and facility cards,
then connect list and map to one shared filter state. Mount the map through a
client component; use `next/dynamic` with `ssr: false` inside that client boundary
if necessary. Include map loading/error states, valid-coordinate markers and
an explanation for unmapped results. Validate keyboard and mobile behavior.

Installed upstream map notes: the default MapLibre import was changed to a
namespace import for MapLibre 6 compatibility, and popup text now reads the hex
foreground token directly. The upstream imperative ref/portal implementation
triggers `react-hooks/refs` and `react-hooks/exhaustive-deps`; those rules are
exempted **only for the installed map file** in ESLint. Review/refactor its
lifecycle and portal readiness before mounting it. It is type-checked now but
has intentionally not been exercised as a live map during Phase 1.

## Phase 3 — persistent data and complete flows (not started)

Select persistence, implement the repository adapter, and obtain an authorized
dataset with usage/redistribution rights. Plan validation, source attribution,
deduplication, idempotent imports, source-vs-import timestamps, and update handling.
Complete search, selection, map/list synchronization, facility detail, pagination,
empty/error/loading states, and end-to-end tests against the persistent adapter.
Do not turn fictional Tier, power, or other demo metrics into real claims.

## External requirements and references

- [Creative Tim Map documentation](https://www.creative-tim.com/ui/docs/components/map)
  reviewed for installation, client-side MapLibre usage, coordinates, and attribution.
  Future tile rendering requires network access, browser WebGL support, and
  retention of required map/tile/data attribution. Review provider terms before launch.
- [Data Center Map](https://www.datacentermap.com/) is the proposed primary source.
  An API is **not assumed**. Obtain explicit authorization and a suitable licensed
  export/feed or other approved access method. No records were scraped or imported.
- No Phase 1 external-data credentials are required. Real data acquisition and
  any commercial tile arrangements remain future requirements.

## Phase 1 validation results

`npm run validate` passed: ESLint (with the documented upstream map exceptions),
TypeScript, all 7 repository contract tests, and the optimized production build.
`npm start -- --hostname 127.0.0.1 --port 3000` started successfully. The production
page was inspected in the browser: shell regions and four-record demo count
rendered; no captured browser warnings or errors. Narrow layout stacks the regions;
desktop layout places the sidebar on the left. Live map behavior remains untested
and intentionally deferred. No Phase 1 blocker remains.
