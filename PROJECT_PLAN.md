# Data Center Atlas — application and research progress

**Current local data: 17,875 imported facilities from Ringmast4r's attributed
Global-Data-Center-Map snapshot; 6,086 are mapped.** This is a static snapshot, not
a live feed. Demo mode remains available and is the default for a clean checkout.
See [source, license, mapping, exclusions and reproduction](docs/sources/RINGMAST4R.md).

## Mapped explorer and separate profiles

The public explorer now shows only the 6,086 geolocated facilities. Its title is
“Discover data centers”. Each mapped facility has a dedicated Overview / Specs /
Location page, with safe filter-preserving Back to map navigation and linked sources.
Migration 002 stores research separately from imported records. The 1,000-candidate
selection is complete; **official-source research is 23 reviewed, 16 enriched, 973 pending, 4 in progress**.
The requested 1,000-facility research is not complete. See [research workflow and
progress](docs/RESEARCH.md) and `research/report.json`.

## Architecture

Next.js 16 App Router, React 19, strict TypeScript, Tailwind CSS 4, shadcn/ui,
MapLibre GL JS 6.11.2, and SQLite through Node's `node:sqlite`. npm lockfile included.
Node >=22.13 required; validated on Node 26.8.1 / npm 11.19.0.

The established Phase 2 map architecture is retained: **official OpenFreeMap Dark
+ direct MapLibre**, not Creative Tim. Phase 2 explicitly removed that wrapper.
The geographic style, globe projection, attribution and original panel design remain.

```text
src/app/                       Server page, loading/error boundaries, theme tokens
src/app/api/explorer/           GET-only, no-cache read endpoint
src/components/layout/         Shared query/selection state, URL sync, mobile sheet
src/components/explorer/        Search, filters, tags, list, details, states
src/components/map/            Direct MapLibre globe, clusters and selection layer
src/components/ui/             Shared shadcn component
src/domain/                    Model, runtime validation, URL/filter contracts
src/data/repository.ts          Replaceable async repository contract
src/data/demo/                  Explicit fictional in-memory adapter
src/data/sqlite/                Database access, migrations, persistent adapter
src/data/explorer.ts            Consistent list/map/options/selection read service
src/data/index.ts               Server-only mode boundary
src/import/                    CSV/GeoJSON parsing, normalization, upsert reporting
migrations/                    Versioned SQL schema and indexes
scripts/                       Local migration/import commands, worker preparation
fixtures/                      Clearly fictional CSV, GeoJSON and column mappings
tests/                         Repository, query, SQLite and importer checks
docs/                          Detailed import and deployment instructions
```

## Data and repository contract

`DataCenter` retains all Phase 1 fields: internal/source IDs, name/operator,
country/city/address, coordinates, description/image, status, MW, m², Tier metadata,
PUE, operational year, source URL/update date, import timestamp and explicit demo flag.
Unknown optional values are null. Latitude/longitude are finite WGS84 degrees in
[-90,90]/[-180,180]; incomplete pairs remain searchable but never become points.
GeoJSON uses **[longitude, latitude]**. PUE is dimensionless, power is MW, area m².
Source date and import timestamp are independent; no invented source update dates.

The async interface still exposes `list`, `getById`, `getFilterOptions`, and
`getMapFeatures`. Text search is case-insensitive substring matching across name,
operator, city, country (also country code, address and description). Exact filters
for country/city/operator/status combine with AND. SQL uses bound parameters;
percent/underscore are literal search characters. Results use stable internal-ID
order, one-based pagination, and total counts independent of loaded page size.

SQLite stores the validated complete model as JSON with indexed identifier/filter
columns. Migration 001 adds uniqueness for source namespace + source ID, coordinate
checks, and country/city/operator/status/identity indexes. Runtime reads validate
stored records. A server-only boundary prevents database imports into client code.

## Completed scope

### Phase 1

Established stack, nullable model, filter/repository contracts, fictional adapter,
seven initial contract tests, theme tokens and shell.

### Phase 2

Built the black interface, 380 px desktop sidebar, independent scrolling and mobile
bottom sheet. Integrated the verified official Dark style endpoint
`https://tiles.openfreemap.org/styles/dark`, globe projection, map controls,
fullscreen/reset, loading/error/retry, resize observation, and selection/detail views.

### Phase 3

- Persistent SQLite repository, transactional migrations and administrative imports.
- Explicit server modes: `demo` is the default in-memory adapter; `imported` reads
  only non-demo rows from SQLite. Fixture imports stay flagged as demo and are
  excluded from imported mode. Missing storage returns an error, never demo fallback.
- CSV/GeoJSON importer with explicit column mappings, source namespaces, stable
  source IDs, country/date/unit normalization, coordinate checks, URL validation,
  dry runs, deterministic upserts and per-row inserted/updated/skipped/invalid reports.
  Conflicting IDs and ambiguous natural-identity duplicates are flagged, not merged.
  No deletion of records absent from a later file. No public upload/write endpoint.
- Search debounces for 300 ms; cancelled requests and a per-effect active guard
  prevent older responses replacing new state. Failure keeps the last successful
  list/map marked as stale and allows retry. Invalid rows produce actionable reasons.
- Country/city/operator/status filters, individual tags, clear-all and country-scoped
  city choices. Changing country clears city; invalid shared country/city combinations
  are normalized by the server. Empty views and unavailable data have explicit states.
- Search, filters, page and selected ID are stored in URL parameters. Refresh and
  browser history restore them. Results have 20-item pagination; counts include all
  matches. Back from details returns to results **without clearing selection**, so
  pagination preserves the selected facility. Excluding filters clear selection.
- List and map receive one consistent filtered response; persistent reads share a
  transaction snapshot. All matching geolocated facilities are mapped, not only the
  loaded page. A visible message explains the total-vs-mapped difference.
- Clustered GeoJSON source, count labels and click-to-expand. Individual points appear
  as clusters separate. Selected facility uses an independent unclustered orange
  source/layer so it stays visible even inside a cluster. Camera focus depends only
  on selected ID/coordinates; unrelated query/page updates do not reset it.
- Safe source links, available metadata, null-value labels and demo/imported indicators
  remain synchronized. Keyboard focus restoration, mobile collapse/expand, map
  resizing and reduced-motion handling are preserved.

## Run and validate

```sh
npm ci
npm run dev
npm run db:migrate       # only needed for persistent storage
npm run import -- --file PATH --format csv --mapping PATH --source SOURCE --authorized --dry-run
npm run validate        # lint + type checking + all tests + production build
npm start               # after production build
```

See [setup and deployment](docs/DEPLOYMENT.md) and
[column mapping and authorized imports](docs/DATA_IMPORT.md) for full instructions.
Default database path is `data/atlas.sqlite`; override `ATLAS_DB_PATH`.
`ATLAS_DATA_MODE=imported` activates persistent records. These variables are server
only. Administrative scripts use shell environment variables rather than loading
Next's `.env.local` automatically.

The dev/build scripts use Webpack. Predev/prebuild copy both MapLibre worker modules
from the installed version. Generated worker assets are omitted from Git and lint;
application code has no map-specific React lint exemptions.

## Verification results

- 20 automated tests pass: original contracts, SQLite persistence/reopen and migration
  repeatability, unit/country/date normalization, GeoJSON order/null geometry,
  invalid-coordinate/URL/date/header reports, repeated imports, dry-run isolation,
  duplicate ambiguity, fixture separation, SQL/demo filter parity and injection-like
  search strings, all-matching map counts, pagination/selection and URL round trips.
- CLI smoke test: dry run reported 2 possible inserts, real **fixture** import inserted
  2, identical reimport inserted 0 and skipped 2. This used a separate test database.
- Browser checks: clicking a map point opened the correct facility and URL; search + country + city + operator + status produced the same
  list/map match; keyboard selection opened correct details; refresh retained the
  selected facility and all URL filters. A country change removed the invalid city
  and excluded selection. Fast successive searches settled on the final input.
- Missing-coordinate search returned one list result and zero map points with an
  explanation; mobile keyboard activation opened its details without a fabricated
  location. Desktop/mobile layout and attribution remain usable.
- Read-API checks verified filter/selection data, fixture exclusion from imported
  mode, HTTP 405 for POST, and HTTP 503 with no demo fallback when the database is unavailable.
- Lint, TypeScript, and production build pass. No application browser errors were
  observed during the tested flows. The imported snapshot was also checked in the
  browser for cluster expansion and combined filters; production load testing remains
  a deployment task. Pagination is additionally covered with 45 synthetic records.

## External dependencies and limitations

- **Current snapshot:** Ringmast4r grants attributed reuse; its license and import
  report are retained under `docs/sources/`. Coordinates and place names are not
  independently verified. Future source updates require identity and rejection review.
- **Alternative source/license:** [Data Center Map exports](https://www.datacentermap.com/research/)
  currently lists CSV/GeoJSON and other export formats; API access is described as
  forthcoming. Its [Terms of Use](https://www.datacentermap.com/legal/terms/) restrict
  automated retrieval, external database reuse and redistribution without permission.
  Obtain a licensed export and confirm this application's audience/display/API rights.
  No website facility records were scraped and no live integration is claimed.
- **Hosting:** imported mode needs persistent local storage, migrations, backups and
  an appropriate Node runtime. SQLite WAL is not suitable for ephemeral/serverless
  disk or a shared network filesystem. Larger deployments can replace the adapter.
- **Map service:** WebGL and access to OpenFreeMap are required. Its official Dark
  style references `circle-11`, absent from its published sprite; this can emit a
  nonfatal upstream warning. Geographic styling has not been altered to hide it.
- Reduced-motion paths are implemented and reviewed against MapLibre's camera
  behavior; OS preference switching and forced GPU loss were not simulated.
- The originally referenced composition screenshot was not supplied; the existing
  approved written composition and Phase 2 implementation were preserved.
