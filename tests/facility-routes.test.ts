import test from "node:test";
import assert from "node:assert/strict";
import { demoFacilities } from "../src/data/demo/facilities";
import { openDatabase,migrate,writeRecord } from "../src/data/sqlite/database";
import { SqliteDataCenterRepository } from "../src/data/sqlite/repository";
import { DemoDataCenterRepository } from "../src/data/demo/repository";
import { presentFacility,knownText } from "../src/domain/facility-presentation";
import { baseFacilityPath } from "../src/domain/facility-path";
import { detailHref } from "../src/domain/detail-navigation";

test("country/name routes are unique, resolvable and stable across reimports",async()=>{
 const db=openDatabase(":memory:");migrate(db);
 try {
  const first={...demoFacilities[0],id:"route-a",sourceId:"a",name:"London & West",countryCode:"GB",country:"United Kingdom"};
  const second={...first,id:"route-b",sourceId:"b"};
  for(const record of [first,second])writeRecord(db,"test",record);
  const repo=new SqliteDataCenterRepository(db,true);
  assert.equal((await repo.getById(first.id))?.detailPath,"/united-kingdom/london-and-west");
  assert.equal((await repo.getById(second.id))?.detailPath,"/united-kingdom/london-and-west-2");
  assert.equal((await repo.getByPath("/united-kingdom/london-and-west-2"))?.id,second.id);
  assert.equal(await repo.getByPath("/germany/london-and-west"),null);
  writeRecord(db,"test",{...first,name:"Renamed facility"});migrate(db);
  assert.equal((await repo.getById(first.id))?.detailPath,"/united-kingdom/london-and-west");
  assert.equal((await repo.getByPath("/united-kingdom/london-and-west"))?.name,"Renamed facility");
  const list=await repo.list();assert.ok(list.items.every(item=>item.detailPath));
  const url=new URL(detailHref(list.items[0],"countryCode=GB&page=2"),"https://example.com");
  assert.equal(url.pathname,list.items[0].detailPath);
  assert.ok(url.searchParams.get("return")?.includes("page=2"));
  assert.equal(db.prepare("SELECT count(*) n FROM facility_routes").get()!.n,2);
 }finally{db.close();}
});
test("placeholders are hidden without erasing actual names or mutating source records",async()=>{
 const record={...demoFacilities[0],city:"tbc",address:"tbc Colombia",operator:"TBD"};
 const display=presentFacility(record);
 assert.equal(display.city,null);assert.equal(display.address,null);assert.equal(display.operator,null);
 assert.equal(record.city,"tbc");assert.equal(knownText("TBC Telecom"),"TBC Telecom");
 assert.equal(knownText("N/A"),null);assert.equal(knownText("To be confirmed"),null);
 const repo=new DemoDataCenterRepository([record]);
 assert.deepEqual((await repo.getFilterOptions()).cities,[]);
 assert.equal((await repo.getById(record.id))?.city,null);
 assert.equal((await repo.getByPath((await repo.getById(record.id))!.detailPath!))?.id,record.id);
 assert.equal(baseFacilityPath({...record,name:"Équinix / Paris",country:"France",countryCode:"FR"}),"/france/equinix-paris");
});
