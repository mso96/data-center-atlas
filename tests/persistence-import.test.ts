import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { openDatabase,migrate,writeRecord } from "../src/data/sqlite/database";
import { SqliteDataCenterRepository } from "../src/data/sqlite/repository";
import { importRecords,normalizeRows } from "../src/import/importer";
import { demoFacilities } from "../src/data/demo/facilities";
import { DemoDataCenterRepository } from "../src/data/demo/repository";
import { loadExplorer } from "../src/data/explorer";
import { parseQuery,serializeQuery } from "../src/domain/explorer-query";
const csv = readFileSync("fixtures/facilities.csv","utf8");
const mapping = JSON.parse(readFileSync("fixtures/mapping.csv.json","utf8"));
const geo = readFileSync("fixtures/facilities.geojson","utf8");
const geoMapping = JSON.parse(readFileSync("fixtures/mapping.geojson.json","utf8"));
function database() { const db=openDatabase(":memory:"); migrate(db); return db; }

test("CSV upserts are durable, idempotent, normalized, and preserve unknowns", async () => {
  const dir=mkdtempSync(path.join(tmpdir(),"atlas-test-")); const filename=path.join(dir,"test.sqlite");
  let db=openDatabase(filename);
  try {
    migrate(db); migrate(db);
    const first=importRecords(db,csv,"csv",mapping,"test",false);
    assert.equal(first.inserted,2,JSON.stringify(first)); assert.equal(first.invalid,0);
    const repo=new SqliteDataCenterRepository(db);
    const before=await repo.list();
    const known=before.items.find(r => r.sourceId === "fixture-001")!;
    assert.equal(known.powerCapacityMw,12); assert.ok(Math.abs(known.facilityAreaSqM! - 929.0304) < 1e-8);
    assert.equal(known.countryCode,"GB"); assert.equal(known.sourceUpdatedAt,"2026-09-01");
    assert.equal(known.sourceUrl,"https://example.com/fictional-001");
    assert.equal((await repo.getMapFeatures()).features.length,1);
    assert.equal(before.items.find(r => r.sourceId === "fixture-002")!.latitude,null);
    assert.equal(importRecords(db,csv,"csv",mapping,"test",false).skipped,2);
    assert.equal((await repo.getById(known.id))!.importedAt,known.importedAt);
    const update=importRecords(db,csv.replace("12000","15000"),"csv",mapping,"test",false);
    assert.equal(update.updated,1); assert.equal(update.skipped,1);
    db.close(); db=openDatabase(filename,true);
    assert.equal((await new SqliteDataCenterRepository(db).getById(known.id))!.powerCapacityMw,15);
  } finally { db.close(); rmSync(dir,{recursive:true,force:true}); }
});
test("dry-run reports changes without writing; absent records are retained", async () => {
  const db=database();
  try {
    assert.equal(importRecords(db,csv,"csv",mapping,"test",false,true).inserted,2);
    assert.equal((await new SqliteDataCenterRepository(db).list()).total,0);
    importRecords(db,csv,"csv",mapping,"test",false);
    importRecords(db,csv.split("\n").slice(0,2).join("\n"),"csv",mapping,"test",false);
    assert.equal((await new SqliteDataCenterRepository(db).list()).total,2);
  } finally { db.close(); }
});
test("GeoJSON uses longitude/latitude and supports null geometry", async () => {
  const db=database();
  try {
    const report=importRecords(db,geo,"geojson",geoMapping,"geo",true);
    assert.equal(report.inserted,2,JSON.stringify(report));
    const repo=new SqliteDataCenterRepository(db,true); const features=await repo.getMapFeatures();
    assert.deepEqual(features.features[0].geometry.coordinates,[103.8198,1.3521]);
    assert.equal(features.missingCoordinatesCount,1);
    assert.equal(importRecords(db,geo,"geojson",geoMapping,"geo",true).skipped,2);
    assert.equal((await new SqliteDataCenterRepository(db).list()).total,0,"Fixture records never leak into imported mode");
  } finally { db.close(); }
});
test("invalid rows give field-specific actionable reasons", () => {
  const simple={columns:{sourceId:"id",name:"name",latitude:"lat",sourceUpdatedAt:"date"}};
  const rows=normalizeRows("id,name,lat,date\na,A,91,2026-01-01\nb,B,0,02/03/2026\nc,,0,2026-01-01\nd,D,NaN,2026-01-01","csv",simple,"test",true);
  assert.match(rows[0].error!,/latitude/); assert.match(rows[1].error!,/sourceUpdatedAt/); assert.match(rows[2].error!,/name/); assert.match(rows[3].error!,/latitude/);
  assert.throws(() => normalizeRows("id,id\na,b","csv",simple,"test",true),/unique/);
  assert.match(normalizeRows("id,name\na,A","csv",simple,"test",true)[0].error!,/mapped column/);
});
test("invalid geometry, countries, dates and dangerous source URLs are rejected", () => {
  const rows=normalizeRows(geo.replace('[103.8198,1.3521]','[181,1]'),"geojson",geoMapping,"geo",true);
  assert.match(rows[0].error!,/longitude/);
  assert.match(normalizeRows(geo.replace('"Point"','"Polygon"'),"geojson",geoMapping,"geo",true)[0].error!,/Point/);
  assert.match(normalizeRows(csv.replace("UK,London","Atlantis,London"),"csv",mapping,"test",true)[0].error!,/country/);
  assert.match(normalizeRows(csv.replace("https://example.com/fictional-001","javascript:alert(1)"),"csv",mapping,"test",true)[0].error!,/sourceUrl/);
  assert.match(normalizeRows(csv.replace("2026-09-01","2026-02-30"),"csv",mapping,"test",true)[0].error!,/sourceUpdatedAt/);
});
test("ambiguous duplicates and conflicting source IDs are flagged without silent merges", async () => {
  const db=database(); const simple={columns:{sourceId:"id",name:"name"}};
  try {
    let report=importRecords(db,"id,name\na,Same\nb,Same","csv",simple,"test",true);
    assert.equal(report.invalid,2); assert.equal(report.inserted,0);
    report=importRecords(db,"id,name\na,First\na,Other","csv",simple,"test",true);
    assert.equal(report.invalid,2);
    report=importRecords(db,"id,name\na,First\na,First","csv",simple,"test",true);
    assert.equal(report.inserted,1); assert.equal(report.skipped,1);
    report=importRecords(db,"id,name\nb,First","csv",simple,"different-source",true);
    assert.equal(report.invalid,1); assert.match(report.rows[0].reason,/Ambiguous duplicate/);
    assert.equal((await new SqliteDataCenterRepository(db,true).list()).total,1);
  } finally { db.close(); }
});
test("SQLite and demo filtering agree, including literal wildcard text and missing coordinates", async () => {
  const db=database();
  try {
    for(const record of demoFacilities) writeRecord(db,"demo",{...record,sourceId:record.id});
    const sql=new SqliteDataCenterRepository(db,true); const demo=new DemoDataCenterRepository(demoFacilities.map(r=>({...r,sourceId:r.id})));
    for(const filters of [{},{search:" EMBER "},{countryCode:"gb",city:"LONDON",status:"operational" as const},{operator:"Fictional Ember Compute"},{search:"%"},{search:"' OR 1=1 --"},{countryCode:"FI"}]) {
      assert.deepEqual(await sql.list(filters),await demo.list(filters));
      assert.deepEqual(await sql.getMapFeatures(filters),await demo.getMapFeatures(filters));
    }
  } finally { db.close(); }
});
test("selection survives pagination, is excluded by filters, URL state round-trips, invalid city resets", async () => {
  const records=Array.from({length:45},(_,i)=>({...demoFacilities[0],id:`test-${String(i).padStart(3,"0")}`,name:`Facility ${i}`}));
  const repo=new DemoDataCenterRepository(records);
  const query=parseQuery(new URLSearchParams("search=Facility&countryCode=gb&page=2&selected=test-001"));
  assert.deepEqual(parseQuery(new URLSearchParams(serializeQuery(query))),query);
  let result=await loadExplorer(repo,query,"demo");
  assert.equal(result.page.items.length,20); assert.equal(result.page.total,45); assert.equal(result.features.features.length,45); assert.equal(result.selected?.id,"test-001");
  result=await loadExplorer(repo,{...query,filters:{search:"absent"}},"demo");
  assert.equal(result.selected,null); assert.equal(result.page.total,0); assert.equal(result.query.page,1);
  result=await loadExplorer(new DemoDataCenterRepository(),{filters:{countryCode:"GB",city:"Helsinki"},page:1,selectedId:null},"demo");
  assert.equal(result.query.filters.city,undefined); assert.equal(result.page.total,1);
});
