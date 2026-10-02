import type { DatabaseSync } from "node:sqlite";
import { researchProfileSchema, type ResearchProfile } from "../../domain/research/profile";
export function getProfile(db:DatabaseSync,id:string):ResearchProfile|null {
 const row=db.prepare("SELECT profile FROM research_profiles WHERE facility_id=?").get(id);
 return row ? researchProfileSchema.parse(JSON.parse(String(row.profile))) : null;
}
export function saveProfile(db:DatabaseSync,input:unknown) {
 const p=researchProfileSchema.parse(input),now=new Date().toISOString();
 if(!db.prepare("SELECT 1 FROM facilities WHERE id=?").get(p.facilityId)) throw new Error("Unknown facility ID");
 db.exec("BEGIN IMMEDIATE");
 try {
  db.prepare("INSERT INTO research_profiles VALUES (?,?,?) ON CONFLICT(facility_id) DO UPDATE SET profile=excluded.profile,updated_at=excluded.updated_at").run(p.facilityId,JSON.stringify(p),now);
  db.prepare("DELETE FROM research_sources WHERE facility_id=?").run(p.facilityId);
  db.prepare("DELETE FROM research_facts WHERE facility_id=?").run(p.facilityId);
  for(const s of p.sources) db.prepare("INSERT INTO research_sources VALUES (?,?,?,?,?,?)").run(p.facilityId,s.id,s.url,s.title,s.accessedAt,s.publishedAt);
  for(const f of p.facts) db.prepare("INSERT INTO research_facts VALUES (?,?,?)").run(p.facilityId,f.id,JSON.stringify(f));
  db.prepare("UPDATE research_queue SET status=?,review_note=?,reviewed_at=? WHERE facility_id=?").run(p.status,p.reviewNote,p.status==="reviewed" ? now : null,p.facilityId);
  db.exec("COMMIT");
 }catch(e){db.exec("ROLLBACK");throw e;}
 return p;
}
