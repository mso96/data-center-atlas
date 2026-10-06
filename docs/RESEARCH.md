# Facility profiles and the 1,000-facility research selection

## Current status — not a completed 1,000-profile research project

The public explorer and detail routes cover the **6,086 mapped records**. The
11,789 records without coordinates remain in SQLite for administrative access and
future correction; they do not contribute to public filters, lists, counts or maps.
All mapped records have Overview, Specs and Location pages with available data.

The research queue contains **1,000 candidates in 140 countries**, arranged in ten
batches of 100. **131 have been reviewed and 57 enriched from primary sources;
858 remain pending and eleven are in progress** (6 October 2026). The October 5 50-candidate
group contains 14 enriched profiles, 35 completed reviews without publishable facts,
and one unresolved source-access case. A separate audit withdrew 58 unsupported
automatically generated Equinix reviews and their copied location facts.
See [individual outcomes and audit](RESEARCH_2026-10-05.md). Selecting a candidate is not research completion. Do not
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
These profiles show a “Source-verified” badge with a visible explanation that map
locations may be approximate. A source link or completed review without verified
facts does not qualify; pending, in-progress and conflicting-only profiles do not
receive the badge. This applies to eligible profiles across all research groups.

Routes: `/<country>/<facility-name>?tab=location|specs|overview` (legacy ID URLs redirect with HTTP 308). Location is the default
and first tab, followed by Specs and Overview. Explorer results put source-verified
profiles first before pagination, with stable ID ordering within each group; search
and filters retain this ordering. Cards display the same verification badge.
The header and map no longer repeat imported-data status/count boxes. Dataset
attribution and coordinate-accuracy notes appear in the explorer footer, followed
by a single-line builder credit. Built-in basemap attribution remains on the map.
`return` contains only the
canonical explorer query, including selected facility; arbitrary redirect URLs are
never accepted. Invalid/nonmapped IDs render the not-found view with `noindex`.
Unknown profile routes return HTTP 404 before streaming the page.
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

## Specs coverage audit — 5 October 2026

Of 35 enriched profiles, eight initially lacked verified facts shown in Specs.
Klagenfurt's source-backed ISMS certificate was filed in Overview; AWS 42A Bluett's
21,100 m² **land** area was filed in Location. Both now appear in Specs with their
original source references and scope. The certificate and council report were
rechecked. CFIN Atlantico now includes two Tier III awards from the official Uptime
Angola listing, readable in its indexed text (a direct list request returned 403).
These awards do not establish operational certification or power/cooling values.

31 enriched profiles now have sourced Specs content. Four retain only location or
background facts: 1–21 Templar Road, 98 Radnor Drive, AWS 54–80 Ferris Rd,
and Rue du Canon 36. Their missing technical information is not fabricated. The
Templar street-range discrepancy remains unresolved; SYD10's current specifications
were not copied to that legacy record. Verification badges now enumerate sourced
sections and explicitly describe their limited coverage.

Canberra follow-up: the 2019 Cyxtera handbook supplies the historical CBR1-A
minimum density of 150 W/ft². NEXTDC's official pages identify the same address
as C1 and publish building-level capacity, area, power, cooling, connectivity and
security. These are now shown with explicit **host building** labels and a scope
note. Neither the current Cyxtera tenancy nor its allocated capacity is inferred;
base facility capacity/area/PUE values remain null. PUE 1.4 is a design target.

## October 6 continuation

See [the next-group progress report](RESEARCH_2026-10-06.md): All 50 received an individual research pass: 22 enriched with cited Specs,
22 reviewed without publishable building-level facts, and six still in progress. Older Specs-audit counts
above are the October 5 snapshot. Current coverage is 53 of 57 enriched profiles.

`website` is an optional sourced research field: HTTPS URL, display label, kind
(`facility`, `operator`, or `host-facility`) and source IDs. All three identity checks
are required. Only reviewed profiles display it in At a glance. It neither makes a
profile verified by itself nor modifies the imported record. There are 44 published
website fields, including an explicitly labelled host link for Canberra.
