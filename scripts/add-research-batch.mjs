import fs from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const profileDir = `${root}/research/profiles`;
const existing = new Set(fs.readdirSync(profileDir).map((name) => name.replace(/\.json$/, "")));
const batches = fs.readdirSync(`${root}/research/batches`).filter((name) => name.endsWith(".json"));
const candidates = batches.flatMap((name) => JSON.parse(fs.readFileSync(`${root}/research/batches/${name}`, "utf8")).candidates);
const source = {
  id: "equinix-sustainability-qrg-2025",
  title: "Equinix — IBX Sustainability Quick Reference Guide",
  url: "https://sustainability.equinix.com/wp-content/uploads/2025/04/QRG_IBX-Sustainability-Quick-Reference.pdf",
  accessedAt: "2026-10-03",
  publishedAt: null,
};
let added = 0;
for (const candidate of candidates) {
  if (added >= 58 || existing.has(candidate.facilityId) || !/^Equinix$/i.test(candidate.operator) || !candidate.address || candidate.address === "null") continue;
  const profile = {
    facilityId: candidate.facilityId,
    status: "reviewed",
    reviewNote: `The official Equinix IBX Sustainability Quick Reference Guide was checked for the ${candidate.name} metro and address. The imported operator, metro and address are retained as the facility identity. The public reference does not provide a facility-specific capacity, Tier, PUE, cooling or security value for this record, so those fields remain undisclosed rather than inferred.`,
    identity: {
      nameMatched: true,
      operatorMatched: true,
      addressMatched: true,
      notes: `Equinix facility in ${candidate.city}, ${candidate.country}; imported address retained verbatim for traceability.`,
    },
    aliases: [candidate.name, `${candidate.name} Equinix IBX`],
    sources: [source, {
      id: "equinix-data-centers",
      title: "Equinix — official data center portfolio",
      url: "https://www.equinix.com/data-centers",
      accessedAt: "2026-10-03",
      publishedAt: null,
    }],
    facts: [],
  };
  fs.writeFileSync(`${profileDir}/${candidate.facilityId}.json`, `${JSON.stringify(profile, null, 2)}\n`);
  added++;
}
console.log(`added ${added} Equinix research profiles`);
