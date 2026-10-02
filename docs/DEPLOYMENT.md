# Setup and deployment

## Development and demo mode

```sh
npm ci
npm run dev
```

Node >=22.13 is required for `node:sqlite` without a feature flag. Node 24 LTS or
newer is suitable; validated here on Node 26.8.1. Older supported Node releases may
print an experimental SQLite warning. The default `ATLAS_DATA_MODE=demo` uses
only the four fictional records. No database or credentials are required for demo.

## Imported mode

After obtaining an authorized dataset, follow [DATA_IMPORT.md](DATA_IMPORT.md).
Then start with an absolute persistent database path:

```sh
export ATLAS_DB_PATH=/absolute/persistent/path/atlas.sqlite
npm run db:migrate
# Run the authorized importer against this same ATLAS_DB_PATH.
export ATLAS_DATA_MODE=imported
npm run build
npm start
```

Mode is server-only and cannot be changed through query parameters. `imported`
opens SQLite read-only, excludes fixture records and never silently falls back to
demo. An absent/unmigrated database yields an actionable unavailable-data response.
An initialized empty database yields an empty view. The read endpoint is
`GET /api/explorer`; there is no public upload or write endpoint.

## Storage and operations

- Use a persistent local disk/volume on a Node server/container. Include migrations
  and the admin scripts in the release tooling. Do not use an ephemeral serverless
  filesystem, static export, Edge runtime, or a network filesystem for SQLite WAL.
- Run `npm run db:migrate` during deployment before starting imported mode. Migrations
  are ordered SQL files recorded in `schema_migrations`, each applied transactionally.
- App requests use read-only connections and a consistent transaction snapshot for
  list/count/map/detail reads. The CLI is the only writer; writes are transactional
  with a five-second busy timeout. Keep imports serialized operationally.
- Persist the database and its WAL/SHM sidecars; use SQLite-aware backups or stop
  writers/checkpoint before copying. Test restore procedures. Keep files outside
  `public/`, Git, and user-downloadable directories; restrict filesystem permissions.
- The API exposes authorized records read-only. Place the app behind access control
  when the license limits access. No authentication is bundled for a public read-only
  demo. Do not expose licensed data until the audience and terms permit it.
- Import files/reports can contain licensed data; retain them under the applicable
  license and local access controls. Do not commit real datasets.
- Filter indexes cover source identifiers, country/city, operator, status and duplicate
  review identity. Substring search and map responses scan matching rows; this is
  suited to local/small deployments. For high traffic or very large datasets, replace
  the repository with a server database and optimized search/spatial queries. The
  map intentionally receives all matching points, not a capped first page.
- Next uses Webpack here. Predev/prebuild copy both MapLibre worker modules into
  `public/maplibre/` from the installed dependency version. Keep those assets in the
  deployed build. WebGL plus network access to OpenFreeMap tiles/glyphs/sprites are needed.

## Validation

```sh
npm run validate
```

Runs lint, type checking, repository/import/SQLite/query tests, and production build.
Real data accuracy, provider licensing, production hosting/backups, and external map
service availability remain operational dependencies, not claims of live integration.
