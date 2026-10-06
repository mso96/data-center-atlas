# Data Center Atlas

Completed three-phase application: a black facility explorer with OpenFreeMap Dark,
MapLibre globe/clusters, synchronized URL selection, search and filters, and a
replaceable demo/SQLite/D1 repository.

**The public explorer shows 6,086 mapped Ringmast4r facilities.**
All have separate Overview, Specs and Location pages. Unmapped records remain in
storage. The 1,000-candidate research queue is selected; 131 profiles have been reviewed,
57 enriched from primary sources, 858 remain pending and 11 are in progress
(as of 6 October 2026). [Research status](docs/RESEARCH.md).
A clean checkout defaults to demo mode until the documented import is reproduced.
See [source attribution, license and import instructions](docs/sources/RINGMAST4R.md).

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Requires Node >=22.13. Map worker assets are generated
before dev/build. Run `npm run validate` for lint, type checking, 25 tests, and build.

- [Project plan and verification](PROJECT_PLAN.md)
- [Cloudflare Workers + D1 setup](CLOUDFLARE.md)
- [SQLite setup and deployment](docs/DEPLOYMENT.md)
- [Authorized CSV/GeoJSON imports and column mappings](docs/DATA_IMPORT.md)

Set `ATLAS_DATA_MODE=imported` and `ATLAS_DB_PATH` only after database setup and an
authorized import. The app has a GET-only read API; administrative imports run locally.
