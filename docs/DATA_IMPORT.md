# Authorized data imports

The local application currently uses **17,875 imported Ringmast4r records** under
its attribution license. See [the source-specific guide](sources/RINGMAST4R.md).
No datacentermap.com records have been scraped. The included `fixtures/` CSV/GeoJSON
files remain fictional test data, separate from the imported dataset.

## Obtain permission first

Reviewed 2026-10-02:

- [Data Center Map exports](https://www.datacentermap.com/research/) lists CSV,
  GeoJSON, SHP and KMZ/KML. It describes API access as forthcoming, not an available
  integration to rely on. Contact the provider for a licensed export.
- [Terms of Use](https://www.datacentermap.com/legal/terms/) restrict automated
  retrieval and external database reuse and require consent for distribution/display.
  A file's availability does not establish rights to publish it in this application.

Confirm the license covers storage, map display, redistribution through the app's
read API, expected audience, and updates. `--authorized` is an operator attestation,
not a substitute for a license. No network ingestion or public upload/write API exists.

## Run locally

Use Node >=22.13 from the project directory. The commands read environment variables
from the shell (they do not automatically load Next.js `.env.local`).

```sh
npm ci
npm run db:migrate
# Inspect a licensed file using YOUR mapping, without changing records:
npm --silent run import -- --file /path/to/licensed.csv --format csv \
  --mapping /path/to/mapping.json --source datacentermap --authorized --dry-run
# After reviewing the report:
npm --silent run import -- --file /path/to/licensed.csv --format csv \
  --mapping /path/to/mapping.json --source datacentermap --authorized
```

Default database: `data/atlas.sqlite`. Override `ATLAS_DB_PATH` (migration and app)
or `--db /absolute/path/file.sqlite` (import command). Real imports apply migrations
before processing. Back up the database before administrative changes.

For a safe fictional smoke test, use a separate database:

```sh
npm --silent run import -- --file fixtures/facilities.csv --format csv \
  --mapping fixtures/mapping.csv.json --source fictional-fixtures \
  --db data/fixtures.sqlite --fixture --dry-run
npm --silent run import -- --file fixtures/facilities.csv --format csv \
  --mapping fixtures/mapping.csv.json --source fictional-fixtures \
  --db data/fixtures.sqlite --fixture
npm --silent run import -- --file fixtures/facilities.geojson --format geojson \
  --mapping fixtures/mapping.geojson.json --source fictional-geo \
  --db data/fixtures.sqlite --fixture
```

Fixture imports store `isDemo=true`. Imported application mode selects only
`isDemo=false`; it never relabels fixtures as real data. Default demo mode continues
using the separate in-memory demo adapter, regardless of what a database contains.

## Mapping specification

Mapping JSON has `columns`, optional `units`, `countryAliases`, and `statusAliases`.
`columns` maps each model field to an **exact CSV header or GeoJSON property key**.
No automatic source schema guesses are made. Unknown mapping keys are errors.
Mapped columns missing from a row produce an invalid-row report; unmapped optional
fields become null. `$id` maps the top-level GeoJSON Feature ID.

Required mappings: `sourceId` and `name`. Required row values: nonempty source ID and
name. Internal IDs are deterministic hashes of source namespace + source ID.
Never change the namespace between updates or reuse IDs for different facilities.

| Mapping key | Input / stored value |
|---|---|
| sourceId, name | Stable source identifier; facility name |
| operator, city, address, description | Trimmed text; unknown is null |
| countryCode, country | ISO alpha-2/alpha-3 or recognized English country name; normalized to uppercase alpha-2 + English name; conflicting inputs rejected |
| latitude, longitude | CSV only: decimal WGS84 degrees, latitude [-90,90], longitude [-180,180] |
| status | planned, under-construction, operational, closed; use aliases for source-specific values |
| powerCapacityMw | Numeric value interpreted using `units.power`: MW (default), kW, W |
| facilityAreaSqM | Numeric value interpreted using `units.area`: m2 (default), ft2 |
| tierLevel | I, II, III or IV; no inferred certification |
| tierCertification | Source certification text, kept separately from the level |
| pue | Dimensionless number >=1 |
| operationalYear | Integer calendar year, 1800–2200 |
| sourceUrl, imageUrl | HTTP(S) URL only |
| sourceUpdatedAt | Valid YYYY-MM-DD or ISO timestamp with timezone |

See `fixtures/mapping.csv.json` and `fixtures/mapping.geojson.json` for complete
runnable examples. They describe fictional headers, **not** the provider's schema.

### Normalization rules

- Blank, null, N/A, unknown, and “Not available” become null. Zero stays zero.
- Numeric CSV values must use a decimal point, without thousands separators,
  scientific notation, or embedded unit suffixes. Mixed/ambiguous units are rejected;
  preprocess them with a reviewed mapping rather than guessing.
- kW / 1,000 and W / 1,000,000 produce MW; ft² × 0.09290304 produces m².
- Country names use the bundled ISO dictionary; UK is normalized to GB. Additional
  exact aliases are explicit, e.g. `"countryAliases":{"Britain":"GB"}`.
- Dates like `02/03/2026` are rejected. Date-only values retain their precision;
  timestamps normalize to UTC. `importedAt` is generated independently at import.
- GeoJSON must be a WGS84 FeatureCollection with Point geometry or null geometry.
  Coordinates are **[longitude, latitude]**, with optional third altitude discarded.
  Non-Point geometry, legacy CRS, nonnumeric and out-of-range coordinates are invalid.
  Latitude/longitude property mappings are forbidden for GeoJSON to avoid conflict.
- Missing or partial coordinates stay nullable. Such records remain available to administrative repository queries, but are
  excluded from the public mapped explorer and detail routes. No geocoding or location invention.

## Upserts, duplicates, reporting

Upserts use the unique `(source_key, source_id)` pair. IDs remain stable. Identical
reimports are skipped and retain their previous import timestamp. Changed rows are
replaced by their normalized snapshot and receive a new import timestamp. Optional
fields not provided by a later mapping become null: review mappings before applying
an export with fewer fields. Source dates never use the import timestamp as a fallback.

Conflicting rows sharing an ID are invalid. Different IDs sharing normalized
name/operator/country/city are flagged as ambiguous (including across sources),
not merged. This conservative review may flag legitimate co-located facilities;
resolve identifiers/data with the provider. Identical repeated rows are skipped.

JSON reports contain inserted, updated, skipped and invalid totals plus row ordinal,
source ID, status and reason. CSV row ordinal starts at 1 **after the header** and
is a record number, not necessarily a physical line number for quoted multiline cells.
Dry-run totals mean “would insert/update”; no facility/schema changes are made to
an existing database, and a missing target database is not created.

Valid rows are committed together; invalid rows are excluded and reported. Exit 1
means an invalid row or fatal error occurred, so a mixed report can include committed
valid rows. Syntax/configuration failures produce a top-level JSON error. Database
write failure rolls back the complete batch. There is no delete/prune option:
records absent from later files are retained. A future explicit deletion process
must be separately reviewed.
