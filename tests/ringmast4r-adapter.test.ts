import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync,readFileSync,writeFileSync,rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync } from "node:child_process";
import { normalizeRows } from "../src/import/importer";

test("Ringmast4r adapter preserves coordinate order, nulls, attribution and repeatable derived identities", () => {
  const dir=mkdtempSync(join(tmpdir(),"atlas-adapter-"));
  try {
    const input=join(dir,"input.json"),output=join(dir,"output.csv");
    const revision="a".repeat(40);
    const a={name:'Fictional "North", Hall',company:null,city:"London",state:"",country:"United Kingdom",address:"Fictional address",city_coords:["51.5","-0.1"],capacity_mw:12,status:"Operating"};
    const b={...a,name:"Fictional South",city_coords:[],capacity_mw:null,status:"Canceled"};
    const run=(rows:unknown[]) => {
      writeFileSync(input,JSON.stringify(rows));
      execFileSync(process.execPath,["--import","tsx","scripts/prepare-ringmast4r.ts","--input",input,"--output",output,"--revision",revision]);
      return normalizeRows(readFileSync(output,"utf8"),"csv",JSON.parse(readFileSync("docs/sources/ringmast4r.mapping.json","utf8")),"ringmast4r-atlas",true);
    };
    const first=run([a,b]); assert.ok(first.every(row => row.record),JSON.stringify(first));
    assert.equal(first[0].record!.latitude,51.5); assert.equal(first[0].record!.longitude,-0.1);
    assert.equal(first[0].record!.operator,null); assert.equal(first[0].record!.powerCapacityMw,12);
    assert.equal(first[0].record!.status,"operational"); assert.equal(first[0].record!.sourceUpdatedAt,null);
    assert.equal(first[1].record!.latitude,null); assert.equal(first[1].record!.longitude,null); assert.equal(first[1].record!.status,null);
    assert.match(first[1].record!.description!,/Canceled/); assert.match(first[0].record!.description!,/Ringmast4r/);
    assert.match(first[0].record!.sourceUrl!,new RegExp(revision));
    const second=run([b,{...a,city_coords:[51.6,-0.2]}]);
    assert.equal(first[0].sourceId,second[1].sourceId); assert.equal(first[1].sourceId,second[0].sourceId);
    const changed=run([{...a,address:"A different fictional address"}]);
    assert.notEqual(first[0].sourceId,changed[0].sourceId);
  } finally { rmSync(dir,{recursive:true,force:true}); }
});
