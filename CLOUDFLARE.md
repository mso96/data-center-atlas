# Cloudflare Workers + D1

The app is prepared for **Workers**, not static Cloudflare Pages. It keeps Next.js,
OpenFreeMap and all country/facility URLs. The OpenNext adapter packages server rendering;
D1 replaces the Node-only SQLite repository. Local Node development still uses SQLite
(or the explicit fictional demo repository).

No Cloudflare resources have been created or published by this preparation. The checked-in
D1 ID is a placeholder. Data files, credentials and local D1 state are intentionally ignored.

## Local verification

Use Node 22.13+ and npm. Start from this directory:

```sh
npm ci
npm run cf:types
npm run cf:db:export
npm run cf:db:migrate:local
npm run cf:db:import:local > /tmp/atlas-d1-import.log
npm run cf:build
npm run cf:preview
```

Preview: `http://localhost:3002`. Export reads `data/atlas.sqlite` (or `ATLAS_DB_PATH`).
It also accepts positional input/output paths:
`npm run cf:db:export -- /path/to/atlas.sqlite data/d1-snapshot.sql`.
If starting from a clean checkout, first reproduce the authorized import and research
updates described in `docs/sources/RINGMAST4R.md` and `docs/RESEARCH.md`, or deliberately
set `ATLAS_DATA_MODE` to `demo` in Wrangler vars. Imported mode never silently falls back.

`npm run dev` / `npm run build` remain the Node/SQLite commands. `cf:build` replaces the
server data entry point during compilation and checks that native SQLite is absent.
Both builds use `.next`, so don't run them concurrently. Preview executes `.open-next`.

```sh
npm run lint
npm run typecheck
npm test
npm run build
npm run cf:build
npx wrangler deploy --dry-run --outdir .wrangler/deploy-check
```

Tests include real local D1 bindings through Wrangler; the test runner needs loopback
network permission to start the local Workers runtime. No remote database is used.
Workers binding types are generated without global runtime types, to avoid collisions
with MapLibre's browser DOM types. Re-run `cf:types` after changing bindings.

## First production setup

1. Authenticate with `npx wrangler login`, then confirm the intended account with
   `npx wrangler whoami`. For CI use a scoped Cloudflare API token stored as a secret.
2. Create a D1 database: `npx wrangler d1 create atlas`. Copy its `database_id` into
   `wrangler.jsonc`. In a multi-account environment also set the intended `account_id`.
3. Apply schema and transfer the local authorized snapshot:

   ```sh
   npm run cf:db:migrate:remote
   npm run cf:db:export
   npm run cf:db:import:remote > /tmp/atlas-d1-remote-import.log
   ```

4. Verify counts against `data/d1-snapshot.sql.json`:

   ```sh
   npx wrangler d1 execute atlas --remote --command "SELECT count(*) AS facilities FROM facilities; SELECT count(*) AS mapped FROM facilities WHERE is_demo=0 AND latitude BETWEEN -90 AND 90 AND longitude BETWEEN -180 AND 180; SELECT count(*) AS profiles FROM research_profiles; SELECT count(*) AS facts FROM research_facts; SELECT count(*) AS routes FROM facility_routes;"
   ```

   Prepared snapshot: **17,875 stored / 6,086 mapped**, 190 profiles, 422 facts,
   17,875 routes. Only mapped imported facilities are shown in discovery. Not all
   research profiles contain verified facts. Attribution and location accuracy notes remain.
5. Choose the public origin (your custom domain or actual `workers.dev` address), then:

   ```sh
   ATLAS_SITE_URL=https://YOUR-PUBLIC-HOST npm run cf:deploy
   ```

   The guard blocks the placeholder database ID or a missing/non-HTTPS site URL.
   `ATLAS_SITE_URL` is a **build-time** setting for canonical/Open Graph URLs; changing
   it requires rebuilding. Do not publish a localhost canonical origin.
6. Check `/`, `/api/explorer`, `/australia/canberra?tab=specs`, source/website links,
   combined filters, mobile map loading, and an old `/data-centers/[id]` redirect.
   Unknown detail URLs should return 404; POST `/api/explorer` should return 405.

For Cloudflare Git builds use the repository's app directory as root, install dev
packages, and set `ATLAS_SITE_URL` as a build variable. Build command: `npm run cf:build`.
Deploy command: `node scripts/check-cloudflare-deploy.mjs && npx opennextjs-cloudflare deploy`.
The D1 binding and initial data import must be completed first. No local database is
available in Git builds and none is needed after D1 is populated. Review Workers CPU,
script size and D1 read quotas for the intended traffic; plan limits are not load-tested.

## Data updates and rollback

Make authorized imports and research edits locally, validate them, and export again.
The snapshot contains six application tables, preserves identifiers and source evidence,
and uses idempotent upserts. Missing records are **not deleted**. Conflicting unique
identifiers/routes fail instead of silently merging records. No public upload endpoint exists.

For production updates, create a **new D1 database**, apply migrations, import the full
snapshot, verify it, then change the binding and deploy a new Worker version. Keep the
previous database until rollback is no longer needed. This avoids readers seeing partially
updated data during a multi-statement import, and keeps removed research facts from
lingering in an existing database. Reimporting into the same database is useful locally,
but is additive and not a full replacement. Never point a public Worker at a partially
imported database. Worker rollback also needs the corresponding previous D1 binding.

Keep SQLite backups and the export manifest outside Git. D1 remains persistent separately
from Worker deployments. Public routes are read-only and uncached; no R2 cache bucket,
image service, API key for OpenFreeMap, or public administrative credentials are required.

## Verification and remaining requirements

Validated locally: 25 tests, lint, TypeScript, Node production build, Cloudflare bundle,
D1 schema/import, deployment dry run (1,246.97 KiB compressed Worker), and UI preview
with the real snapshot. Remote deployment, custom-domain
DNS, account quotas and production load testing remain account-specific steps.

The dependency audit currently reports nine linked advisories in the existing
`braces`/`micromatch` build-tool dependency chain (ESLint/shadcn). No compatible patched
version was offered by the audit; avoid the suggested breaking downgrade. Those CLIs
are not exposed through the public Worker, but keep following upstream fixes.

References: [OpenNext setup](https://opennext.js.org/cloudflare/get-started),
[bindings](https://opennext.js.org/cloudflare/bindings),
[D1 import/export](https://developers.cloudflare.com/d1/best-practices/import-export-data/).
