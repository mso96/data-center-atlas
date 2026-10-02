# Imported Ringmast4r snapshot

Data centers (c) Ringmast4r - Global-Data-Center-Map  
https://github.com/Ringmast4r/Global-Data-Center-Map

This local installation now runs on an imported snapshot, not demo records or a
live feed. The separate demo repository is still available with `ATLAS_DATA_MODE=demo`.
A clean checkout defaults to demo: downloaded data, SQLite and `.env.local` are
local artifacts and deliberately excluded from Git.

## License and provenance

- Source revision: `7c1c6f3abcc6e25f0b4b8eeb291e434ddc42ee05`.
- [Pinned JSON export](https://github.com/Ringmast4r/Global-Data-Center-Map/blob/7c1c6f3abcc6e25f0b4b8eeb291e434ddc42ee05/datacenters.json).
- [Pinned license](https://github.com/Ringmast4r/Global-Data-Center-Map/blob/7c1c6f3abcc6e25f0b4b8eeb291e434ddc42ee05/LICENSE), also retained as `RINGMAST4R-LICENSE.txt`.
- License reviewed 2026-10-02: reuse, publication and commercial products permitted
  with visible attribution; do not claim authorship or remove downstream credit.
- This is a different source from datacentermap.com. No records were scraped from
  that website and no rights to its separate exports are assumed.
- The app displays linked credit on the map (also in fullscreen), includes credit
  metadata in the read API, and keeps attribution and a pinned source link in records.

## What was imported

| Outcome | Rows |
|---|---:|
| Source snapshot | 18,110 |
| Inserted | 17,875 |
| Identical repeated rows skipped | 7 |
| Invalid or ambiguous rows excluded | 228 |
| Imported records with coordinates | 6,086 |
| Imported records without coordinates | 11,789 |

The 228 rejected rows comprise 195 unrecognized/ambiguous country values, 32
ambiguous identity duplicates and one missing facility name. `ringmast4r-review.json` records their source row
ordinals, derived IDs, reasons, snapshot checksum and totals. Full dry-run/import/
reimport reports remain in `data/ringmast4r/`. Reimporting this exact snapshot inserted
0, updated 0 and skipped 17,882 rows (including the 7 repeated input rows), while
reporting the same 228 invalid rows. Nothing was silently merged or deleted.

## Mapping and limitations

`prepare-ringmast4r.ts` converts the **JSON** export to an explicit CSV staging
format. Upstream CSV omits coordinates; upstream GeoJSON omits ungeolocated records.

- `company` → operator; country uses the ISO dictionary plus reviewed exact language
  aliases in `ringmast4r.mapping.json`. Invalid country/address fragments are rejected,
  not guessed from other fields. Other city/address text is retained as supplied;
  the source contains incomplete and malformed place names.
- `city_coords` uses **[latitude, longitude]** in this JSON export. The adapter maps
  these to named CSV columns; the repository emits GeoJSON [longitude, latitude].
  Missing, null or empty arrays stay null. Decimal strings pass the normal importer.
  No geocoding, sign corrections, building-level precision or independent verification
  is claimed. The source includes city/state/country centroids and apparent errors.
- `capacity_mw` stays MW. `Operating` → operational, `Planned` → planned. `Canceled`
  has no exact model status, so status stays null and its original text is retained
  in the description. No inference that a cancelled project was an operational/closed site.
- Unknown image, Tier, PUE, area, year and source update date stay null. A repository
  revision is provenance, not a facility update timestamp. `importedAt` is separate.
- **No native upstream IDs exist.** `sourceId` is explicitly prefixed `derived-`
  and hashes NFKC/lowercase/trimmed name, company, country, city, state and address.
  It is stable across row reordering and coordinate/metric changes, but changes to
  identity text require manual reconciliation on future snapshots. Never claim these
  are provider-assigned IDs. Conflicting natural identities are still rejected by
  the generic importer. Review future dry runs; absent old rows are never deleted.

## Reproduce locally

Run from the project root; downloads are pinned and never execute source code:

```sh
mkdir -p data/ringmast4r
curl -fL https://raw.githubusercontent.com/Ringmast4r/Global-Data-Center-Map/7c1c6f3abcc6e25f0b4b8eeb291e434ddc42ee05/datacenters.json -o data/ringmast4r/datacenters.json
node --import tsx scripts/prepare-ringmast4r.ts \
  --input data/ringmast4r/datacenters.json --output data/ringmast4r/prepared.csv \
  --revision 7c1c6f3abcc6e25f0b4b8eeb291e434ddc42ee05
npm --silent run import -- --file data/ringmast4r/prepared.csv --format csv \
  --mapping docs/sources/ringmast4r.mapping.json --source ringmast4r-atlas \
  --authorized --dry-run > data/ringmast4r/dry-run.json
# Review the report; exit 1 is expected for the documented rejected rows.
npm --silent run import -- --file data/ringmast4r/prepared.csv --format csv \
  --mapping docs/sources/ringmast4r.mapping.json --source ringmast4r-atlas \
  --authorized > data/ringmast4r/import-report.json
```

Set these server settings in `.env.local` or the deployment environment:

```dotenv
ATLAS_DATA_MODE=imported
ATLAS_DATASET=ringmast4r
```

`ATLAS_DATASET=ringmast4r` enables the required visible and API source credit; keep it
set wherever this dataset is served. Default database: `data/atlas.sqlite`. Restart
the server after changing settings. Keep the dataset license with any redistribution.

## Verification

16 automated tests, lint, type checking and production build passed. An adapter test
covers nulls, numeric-string coordinate order, CSV quoting, provenance, status handling
and stable IDs across reordered rows/changed coordinates. Full-snapshot dry run,
import and repeat import were executed. Read API checks verified all counts, only
non-demo records, source credit, selection across pages and combined filters. Browser
checks verified imported mode, visible credit, cluster zooming and Equinix + GB
filtering (27 results, 11 mapped). No browser application errors were observed.
