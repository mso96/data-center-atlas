import { readFileSync,writeFileSync,mkdirSync } from "node:fs";
import { parseArgs } from "node:util";
import { openDatabase,defaultDatabasePath,migrate } from "../src/data/sqlite/database";
import { selectResearch } from "../src/data/research/selection";
import { saveProfile } from "../src/data/research/profiles";
import { dataCenterSchema } from "../src/domain/validation";
const {values}=parseArgs({options:{action:{type:"string"},file:{type:"string"},db:{type:"string"},output:{type:"string"}}});
const db=openDatabase(values.db ?? defaultDatabasePath());
try {
 migrate(db);
 if(values.action==="select"){
  if(db.prepare("SELECT count(*) n FROM research_queue").get()!.n)throw new Error("Selection already exists; preserve its stable IDs and research progress");
  const records=db.prepare("SELECT record FROM facilities WHERE is_demo=0").all().map(r=>dataCenterSchema.parse(JSON.parse(String(r.record))));
  const selection=selectResearch(records,JSON.parse(readFileSync("research/operator-groups.json","utf8")));
  db.exec("BEGIN IMMEDIATE");try {for(const c of selection)db.prepare("INSERT INTO research_queue(facility_id,batch,priority,country_code,operator_group) VALUES(?,?,?,?,?)").run(c.facility.id,c.batch,c.priority,c.country,c.group);db.exec("COMMIT");}catch(e){db.exec("ROLLBACK");throw e;}
  mkdirSync("research/batches",{recursive:true});
  for(let batch=1;batch<=10;batch++) writeFileSync(`research/batches/${String(batch).padStart(2,"0")}.json`,JSON.stringify({attribution:"Data centers (c) Ringmast4r - Global-Data-Center-Map",source:"https://github.com/Ringmast4r/Global-Data-Center-Map",batch,candidates:selection.filter(c=>c.batch===batch).map(c=>({facilityId:c.facility.id,name:c.facility.name,operator:c.facility.operator,country:c.facility.country,city:c.facility.city,address:c.facility.address,priority:c.priority,operatorGroup:c.group}))},null,2)+"\n");
  console.log(JSON.stringify({selected:selection.length,batches:10}));
 }else if(values.action==="apply"){
  if(!values.file)throw new Error("--file is required");const payload=JSON.parse(readFileSync(values.file,"utf8"));
  const profiles=Array.isArray(payload)?payload:[payload];for(const p of profiles)saveProfile(db,p);console.log(JSON.stringify({applied:profiles.length}));
 }else if(values.action==="report"){
  const states=db.prepare("SELECT status,count(*) count FROM research_queue GROUP BY status").all();
  const enriched=db.prepare("SELECT count(DISTINCT q.facility_id) n FROM research_queue q JOIN research_facts f ON f.facility_id=q.facility_id WHERE json_extract(f.fact,'$.status')='verified'").get()!.n;
  const report={generatedAt:new Date().toISOString(),selected:db.prepare("SELECT count(*) n FROM research_queue").get()!.n,states,enriched,batches:db.prepare("SELECT batch,status,count(*) count FROM research_queue GROUP BY batch,status").all(),unresolved:db.prepare("SELECT facility_id,status,review_note FROM research_queue WHERE status<>'reviewed' OR facility_id NOT IN (SELECT facility_id FROM research_facts WHERE json_extract(fact,'$.status')='verified') ORDER BY priority").all()};
  if(values.output)writeFileSync(values.output,JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify({...report,unresolved:report.unresolved.length}));
 }else throw new Error("Use --action select|apply|report [--file PROFILE.json] [--output REPORT.json]");
}finally{db.close();}
