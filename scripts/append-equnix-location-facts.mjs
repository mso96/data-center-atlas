import fs from "node:fs";

const root = new URL("..", import.meta.url).pathname;
const profileDir = `${root}/research/profiles`;
const sourceId = "equinix-sustainability-qrg-2025";
const candidates = fs.readdirSync(`${root}/research/batches`).filter((name) => name.endsWith(".json")).flatMap((name) => JSON.parse(fs.readFileSync(`${root}/research/batches/${name}`, "utf8")).candidates);
const byId = new Map(candidates.map((candidate) => [candidate.facilityId, candidate]));
let changed = 0;
for (const name of fs.readdirSync(profileDir)) {
  if (!name.endsWith(".json")) continue;
  const file = `${profileDir}/${name}`;
  const profile = JSON.parse(fs.readFileSync(file, "utf8"));
  if (profile.identity?.operatorMatched !== true || profile.sources?.[0]?.id !== sourceId || profile.facts?.length) continue;
  const candidate = byId.get(profile.facilityId);
  if (!candidate?.address || candidate.address === "null") continue;
  profile.facts = [{
    id: "fact-location-0",
    section: "location",
    category: "Location",
    label: "Operator location reference",
    value: candidate.address,
    sourceIds: [sourceId],
    status: "verified",
  }];
  fs.writeFileSync(file, `${JSON.stringify(profile, null, 2)}\n`);
  changed++;
}
console.log(`added ${changed} location facts`);
