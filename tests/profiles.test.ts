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
test("detail return state preserves filters, page and selection without external redirects",()=>{
 const href=detailHref("demo-001","search=London&countryCode=GB&page=3&selected=demo-002");
 const url=new URL(href,"https://atlas.example");const back=url.searchParams.get("return")!;
 const q=parseQuery(new URLSearchParams(back));assert.equal(q.page,3);assert.equal(q.filters.search,"London");assert.equal(q.selectedId,"demo-001");
 assert.equal(returnQuery("https://evil.example/path","demo-001"),"selected=demo-001");
});
