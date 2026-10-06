import test from "node:test";
import assert from "node:assert/strict";
import { demoFacilities } from "../src/data/demo/facilities";
import { DemoDataCenterRepository } from "../src/data/demo/repository";
import { SqliteDataCenterRepository } from "../src/data/sqlite/repository";
import { openDatabase,migrate,writeRecord } from "../src/data/sqlite/database";
import { loadExplorer } from "../src/data/explorer";
import { selectResearch } from "../src/data/research/selection";
import { getProfile,saveProfile } from "../src/data/research/profiles";
import { researchProfileSchema } from "../src/domain/research/profile";
import { detailHref,returnQuery } from "../src/domain/detail-navigation";
import { parseQuery } from "../src/domain/explorer-query";

test("public explorer enforces mapped eligibility for list, map, options and shared selection",async()=>{
 const db=openDatabase(":memory:");migrate(db);
 try {
  for(const r of demoFacilities)writeRecord(db,"test",{...r,sourceId:r.id});
  for(const repo of [new DemoDataCenterRepository(),new SqliteDataCenterRepository(db,true)]){
   const r=await loadExplorer(repo,{filters:{mappedOnly:false},page:1,selectedId:"demo-004"},"demo");
   assert.equal(r.page.total,3);assert.equal(r.features.features.length,3);assert.equal(r.features.missingCoordinatesCount,0);assert.equal(r.selected,null);
   assert.ok(!r.options.cities.includes("Helsinki"));assert.ok(!r.options.operators.includes("Fictional Aurora Works"));
   assert.equal((await repo.list()).total,4); // retained for administration/imports
  }
 }finally{db.close();}
});

test("selection is deterministic, covers countries, caps operator families and creates ten batches",()=>{
 const records=Array.from({length:1500},(_,i)=>({...demoFacilities[0],id:`test-${String(i).padStart(4,"0")}`,operator:`Operator ${i%15}`,countryCode:["US","GB","DE","SG","ZA"][Math.floor(i/300)],powerCapacityMw:i}));
 const a=selectResearch(records,{"Family":["Operator 0","Operator 1"]});
 const b=selectResearch([...records].reverse(),{"Family":["Operator 0","Operator 1"]});
 assert.equal(a.length,1000);assert.equal(new Set(a.map(c=>c.facility.id)).size,1000);assert.equal(new Set(a.map(c=>c.country)).size,5);
 assert.deepEqual(a.map(c=>c.facility.id),b.map(c=>c.facility.id));
 for(let batch=1;batch<=10;batch++)assert.equal(a.filter(c=>c.batch===batch).length,100);
 for(const group of new Set(a.map(c=>c.group)))assert.ok(a.filter(c=>c.group===group).length<=100);
});
const profile={facilityId:"demo-001",status:"reviewed",reviewNote:"Checked official fictional test record",identity:{nameMatched:true,operatorMatched:true,addressMatched:true,notes:"Fictional test identity match"},aliases:[],sources:[{id:"operator",url:"https://example.com/fixture",title:"Fictional official page",accessedAt:"2026-10-02",publishedAt:null}],facts:[{id:"area",section:"specs",category:"Capacity",label:"Colocation area",value:"100 m²",sourceIds:["operator"],status:"verified"}]};
test("research requires evidence and identity verification and survives base record upserts",()=>{
 assert.equal(researchProfileSchema.safeParse({...profile,identity:{...profile.identity,addressMatched:false}}).success,false);
 assert.equal(researchProfileSchema.safeParse({...profile,sources:[]}).success,false);
 assert.equal(researchProfileSchema.safeParse({...profile,facts:[{...profile.facts[0],sourceIds:["missing"]}]}).success,false);
 const db=openDatabase(":memory:");migrate(db);
 try {
  writeRecord(db,"test",{...demoFacilities[0],sourceId:"stable"});saveProfile(db,profile);
  writeRecord(db,"test",{...demoFacilities[0],sourceId:"stable",powerCapacityMw:99});
  assert.equal(getProfile(db,"demo-001")!.facts[0].value,"100 m²");
  assert.equal(db.prepare("SELECT count(*) n FROM research_sources").get()!.n,1);
  saveProfile(db,profile);assert.equal(db.prepare("SELECT count(*) n FROM research_facts").get()!.n,1);
 }finally{db.close();}
});
test("verified research sorts before pagination without promoting incomplete or conflicting profiles",async()=>{
 const db=openDatabase(":memory:");migrate(db);
 try {
  for(let i=0;i<7;i++)writeRecord(db,"test",{...demoFacilities[0],id:`rank-${i}`,sourceId:`rank-${i}`,isDemo:false,name:`Facility ${i}`});
  saveProfile(db,{...profile,facilityId:"rank-1",facts:[]});
  saveProfile(db,{...profile,facilityId:"rank-2",status:"in-progress"});
  saveProfile(db,{...profile,facilityId:"rank-3",status:"pending"});
  saveProfile(db,{...profile,facilityId:"rank-4",facts:[{...profile.facts[0],status:"conflicting"}]});
  saveProfile(db,{...profile,facilityId:"rank-5"});
  saveProfile(db,{...profile,facilityId:"rank-6"});
  const repo=new SqliteDataCenterRepository(db);
  const first=await repo.list({mappedOnly:true},{pageSize:1});
  const second=await repo.list({mappedOnly:true},{page:2,pageSize:1});
  assert.equal(first.items[0].id,"rank-5");assert.equal(first.items[0].sourceVerified,true);
  assert.equal(second.items[0].id,"rank-6");assert.equal(first.total,7);
  const all=await repo.list();
  assert.deepEqual(all.items.map(r=>r.id),["rank-5","rank-6","rank-0","rank-1","rank-2","rank-3","rank-4"]);
  assert.ok(all.items.slice(2).every(r=>!r.sourceVerified));
  const filtered=await repo.list({search:"Facility 0"});assert.equal(filtered.total,1);assert.equal(filtered.items[0].id,"rank-0");
  assert.equal((await repo.getMapFeatures({mappedOnly:true})).features.length,7);
 }finally{db.close();}
});
test("detail return state preserves filters, page and selection without external redirects",()=>{
 const href=detailHref({id:"demo-001",detailPath:"/united-kingdom/test-facility"},"search=London&countryCode=GB&page=3&selected=demo-002");
 const url=new URL(href,"https://atlas.example");const back=url.searchParams.get("return")!;
 const q=parseQuery(new URLSearchParams(back));assert.equal(q.page,3);assert.equal(q.filters.search,"London");assert.equal(q.selectedId,"demo-001");
 assert.equal(returnQuery("https://evil.example/path","demo-001"),"selected=demo-001");
});


test("official website requires HTTPS, cited identity and survives imported updates",()=>{
 const website={url:"https://example.com/facility",label:"Official facility website",kind:"facility",sourceIds:["operator"]};
 assert.equal(researchProfileSchema.parse(profile).website,null);
 assert.equal(researchProfileSchema.safeParse({...profile,website:{...website,url:"javascript:alert(1)"}}).success,false);
 assert.equal(researchProfileSchema.safeParse({...profile,website:{...website,sourceIds:["missing"]}}).success,false);
 assert.equal(researchProfileSchema.safeParse({...profile,facts:[],identity:{...profile.identity,addressMatched:false},website}).success,false);
 const db=openDatabase(":memory:");migrate(db);
 try {
  writeRecord(db,"test",{...demoFacilities[0],sourceId:"stable"});
  saveProfile(db,{...profile,website:{...website,kind:"host-facility"}});
  writeRecord(db,"test",{...demoFacilities[0],sourceId:"stable",name:"Imported update"});
  assert.deepEqual(getProfile(db,"demo-001")!.website,{...website,kind:"host-facility"});
 }finally{db.close();}
});
