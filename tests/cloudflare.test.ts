import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { getPlatformProxy, unstable_splitSqlQuery } from "wrangler";
import type { D1Database } from "@cloudflare/workers-types";
import { openDatabase, migrate, writeRecord } from "../src/data/sqlite/database";
import { SqliteDataCenterRepository } from "../src/data/sqlite/repository";
import { D1DataCenterRepository } from "../src/data/d1/repository";
import { exportD1Snapshot, snapshotTables } from "../src/data/d1/export";
import { demoFacilities } from "../src/data/demo/facilities";
import { saveProfile, getProfile } from "../src/data/research/profiles";
import { loadExplorer } from "../src/data/explorer";
import type { DataCenterFilters } from "../src/domain/data-center";

test("D1 snapshot round-trip preserves repository results, research, routes and repeatable upserts", {timeout:60000}, async()=>{
  const dir=mkdtempSync(path.join(tmpdir(),"atlas-d1-test-"));
  const config=path.join(dir,"wrangler.json");
  writeFileSync(config,JSON.stringify({name:"atlas-test",compatibility_date:"2026-10-06",d1_databases:[{binding:"DB",database_name:"test",database_id:"test"}]}));
  const db=openDatabase(":memory:");migrate(db);
  const proxy=await getPlatformProxy<{DB:D1Database}>({configPath:config,persist:false,remoteBindings:false,envFiles:[]});
  try {
    for(const record of demoFacilities) writeRecord(db,"fixture",{...record,sourceId:record.id,isDemo:false,description:"Fixture's description\nSecond line; keep quoted punctuation."});
    writeRecord(db,"fixture",{...demoFacilities[0],id:"hidden-demo",sourceId:"hidden-demo",isDemo:true});
    saveProfile(db,{facilityId:"demo-003",status:"reviewed",reviewNote:"Fictional test fixture",identity:{nameMatched:true,operatorMatched:true,addressMatched:true,notes:"Fictional identity"},aliases:["Previous name"],sources:[{id:"official",url:"https://example.com/fixture",title:"Fixture official source",accessedAt:"2026-10-06",publishedAt:null}],facts:[{id:"power",section:"specs",category:"Power",label:"Power",value:"12 MW",sourceIds:["official"],status:"verified"}],website:{url:"https://example.com/fixture",label:"Official website",kind:"facility",sourceIds:["official"]}});
    for(const file of readdirSync("migrations").filter(f=>f.endsWith(".sql")).sort()) {
      await proxy.env.DB.batch(unstable_splitSqlQuery(readFileSync(path.join("migrations",file),"utf8")).map(sql=>proxy.env.DB.prepare(sql)));
    }
    const snapshot=exportD1Snapshot(db);
    assert.equal(snapshot.manifest.mappedFacilities,3);
    const apply=()=>proxy.env.DB.batch(unstable_splitSqlQuery(snapshot.sql).map(sql=>proxy.env.DB.prepare(sql)));
    await apply();await apply();
    for(const table of snapshotTables) assert.equal((await proxy.env.DB.prepare(`SELECT count(*) AS n FROM ${table}`).first<{n:number}>())!.n,snapshot.manifest.tables[table]);
    const local=new SqliteDataCenterRepository(db);
    const remote=new D1DataCenterRepository(proxy.env.DB.withSession("first-primary"));
    const queries:DataCenterFilters[]=[{}, {mappedOnly:true},{search:"ember",countryCode:"GB",city:"London",operator:"Fictional Ember Compute",status:"operational",mappedOnly:true},{countryCode:"FI"},{search:"not a facility"}];
    for(const filters of queries) {
      assert.deepEqual(await remote.list(filters,{pageSize:1}),await local.list(filters,{pageSize:1}));
      assert.deepEqual(await remote.list(filters,{page:2,pageSize:1}),await local.list(filters,{page:2,pageSize:1}));
      assert.deepEqual(await remote.getMapFeatures(filters),await local.getMapFeatures(filters));
      assert.deepEqual(await remote.getFilterOptions(filters),await local.getFilterOptions(filters));
    }
    assert.equal((await remote.list()).items[0].id,"demo-003");
    assert.equal((await remote.getMapFeatures()).missingCoordinatesCount,1);
    assert.equal(await remote.getById("hidden-demo"),null);
    const facility=await local.getById("demo-003");
    assert.deepEqual(await remote.getByPath(facility!.detailPath!),facility);
    assert.deepEqual(await remote.getResearch("demo-003"),getProfile(db,"demo-003"));
    assert.equal(await remote.getByPath("/missing/facility"),null);
    assert.equal(await remote.getResearch("missing"),null);
    await assert.rejects(remote.list({}, {pageSize:101}),RangeError);
    const explorer=await loadExplorer(remote,{filters:{countryCode:"GB",city:"Phoenix"},page:1,selectedId:"demo-003"},"imported","ringmast4r");
    assert.equal(explorer.query.filters.city,undefined);
    assert.equal(explorer.selected,null);
    assert.equal(explorer.page.total,explorer.features.features.length);
    assert.ok(explorer.dataset?.label.includes("Ringmast4r"));
    await proxy.env.DB.prepare("DROP TABLE research_facts").run();
    await assert.rejects(remote.list()); // Unavailable storage must fail, not become an empty success.
  } finally {await proxy.dispose();db.close();rmSync(dir,{recursive:true,force:true});}
});
