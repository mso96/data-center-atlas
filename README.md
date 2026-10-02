# Data Center Atlas

Completed three-phase application: a black facility explorer with OpenFreeMap Dark,
MapLibre globe/clusters, synchronized URL selection, search and filters, and a
replaceable demo/SQLite repository.

**Currently runs on four fictional demo records. No authorized real dataset has
been supplied or imported.**

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Requires Node >=22.13. Map worker assets are generated
before dev/build. Run `npm run validate` for lint, type checking, 15 tests, and build.

- [Project plan and verification](PROJECT_PLAN.md)
- [SQLite setup and deployment](docs/DEPLOYMENT.md)
- [Authorized CSV/GeoJSON imports and column mappings](docs/DATA_IMPORT.md)

Set `ATLAS_DATA_MODE=imported` and `ATLAS_DB_PATH` only after database setup and an
authorized import. The app has a GET-only read API; administrative imports run locally.
