# Facility profiles and the 1,000-facility research selection

## Current status — not a completed 1,000-profile research project

The public explorer and detail routes cover the **6,086 mapped records**. The
11,789 records without coordinates remain in SQLite for administrative access and
future correction; they do not contribute to public filters, lists, counts or maps.
All mapped records have Overview, Specs and Location pages with available data.

The research queue contains **1,000 candidates in 140 countries**, arranged in ten
batches of 100. **Eighteen have been reviewed and fifteen enriched from official sources;
980 remain pending.** Selecting a candidate is not research completion. Do not
advertise the queue as 1,000 verified profiles, or as a definitive global ranking.
Machine-readable progress and all outstanding IDs: `research/report.json`.

Verified initial profiles: Equinix AM5, HE6, SK1 and SG1. Source URLs, access dates,
identity checks and individual facts are saved in `research/profiles/`. Published
operator facts are distinct from imported dataset measurements. Colocation area
is not relabeled as total building area. Global marketing uptime/certification
claims are not inferred to be facility-specific certification. Missing values and
unresolved conflicts are not filled with invented information.

## Architecture

Migration `002_research.sql` creates separate queue, profile, source and fact tables.
Base imports never write these tables. Public routes only read research data; there
is no public write/upload API. Research JSON is validated before each transaction.
A fact must reference an existing source. Publishing verified facts requires explicit
name, operator and address identity checks. Only reviewed profiles' verified facts
are displayed. Every source records an access date and optional publication date.

Routes: `/data-centers/[id]?tab=overview|specs|location`. `return` contains only the
canonical explorer query, including selected facility; arbitrary redirect URLs are
never accepted. Invalid/nonmapped IDs render the not-found view with `noindex`.
Next's streamed responses can carry HTTP 200 even when this view is rendered.
List entries open full profiles in the same tab. Map selection opens the compact
panel, whose View details link opens the full page. Back to map preserves filters,
page and selection. Unknown Specs values are hidden rather than rendered as a table
of unavailable fields. Photos are not used without a verified reuse license.

## Selection policy

Only valid geolocated, non-demo records are eligible. Country quotas start at one,
then distribute remaining places by square-root country size using largest
remainders, with quotas capped at the available pool. In each country, known large
operator groups rank first, then imported MW capacity, data completeness, and stable
ID. `research/operator-groups.json` contains explicit grouping aliases; these are
editorial selection groups, not automatic operator-name changes in public records.

The 10% operator-family cap is applied globally. Every country is represented
before filling its quota; places blocked by the cap go to the next eligible local
candidate and then the global remainder. Unknown operators are not merged into a
single fictitious company. Selection is deterministic and refuses to overwrite an
existing queue. Country-major ordering supplies stable batch IDs; batch order is
not a ranking of importance. Potential duplicate facilities and campus/building
ambiguity must be reviewed against official addresses, not silently merged.

## Local administration

```sh
npm run db:migrate
# A fresh imported database only; refuses to replace an existing queue:
npm run research -- --action select
# Apply a reviewed profile (single object or array); commands use shell env:
npm run research -- --action apply --file research/profiles/PROFILE.json
npm run research -- --action report --output research/report.json
```

Use `--db PATH` or `ATLAS_DB_PATH` for another database. Research commands migrate
before operating. Applying a file of profiles commits each validated profile
independently; a later validation failure leaves earlier committed profiles intact.
Reapplying the same profile is safe. Rebuild the progress report after changes.
For reproducing this installation, import the pinned Ringmast4r dataset first,
select candidates, then apply the committed profile JSON files for the researched facilities.

## Continue the outstanding research

For each pending candidate in `research/batches/`:

1. Search the operator's own facility pages, official technical PDFs and dated
   announcements. Confirm the operator website; do not assume a directory is primary.
2. Record identity evidence, including old names, address differences and whether a
   number describes one building, a campus, IT power or eventual capacity.
3. Write concise original summaries and field-level facts with source references.
   Mark unresolved contradictory facts `conflicting`; these stay unpublished.
4. Set `reviewed` only after the review is actually performed. A no-usable-facts
   review needs the official URLs checked and a specific reason. Do not mark a
   failed page request or an untouched candidate as completed research.
5. Apply the profile locally and regenerate the report. Report reviewed and enriched
   counts separately. Pending work remains visible in the report, not fabricated.

## Attribution

Candidate batch extracts: Data centers (c) Ringmast4r - Global-Data-Center-Map,
https://github.com/Ringmast4r/Global-Data-Center-Map. They use the attribution license
retained under `docs/sources/`. These licensed candidate extracts are deliberately
versioned for reproducibility; raw snapshots and SQLite remain local. No Data Center
Map bulk records or copyrighted descriptions were copied into the profiles.
