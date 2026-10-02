# Data Center Atlas

Phase 2: a black facility explorer with the official OpenFreeMap Dark globe,
direct MapLibre rendering, and synchronized selection across four fictional demos.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Node 22+ and npm required. Worker assets are generated
automatically before dev/build. Run `npm run validate` for lint, types, repository
tests, and the production build.

Search/filter controls remain disabled for Phase 3. No persistent storage or
facility imports are implemented. See [PROJECT_PLAN.md](PROJECT_PLAN.md) for
architecture, verification, the upstream sprite warning, and remaining scope.
