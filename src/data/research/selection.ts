import type { DataCenter } from "../../domain/data-center";
import { hasValidCoordinates } from "../../domain/data-center";
export interface Candidate { facility:DataCenter; group:string; country:string; priority:number; batch:number }
/** Capped, largest-remainder square-root allocation with one place per represented country. */
export function selectResearch(records:DataCenter[],groups:Record<string,string[]>,target=1000):Candidate[] {
 const aliases=new Map(Object.entries(groups).flatMap(([group,names])=>names.map(name=>[name.toLowerCase(),group] as const)));
 const groupOf=(r:DataCenter)=>aliases.get(r.operator?.toLowerCase() ?? "") ?? r.operator?.trim().toLowerCase() ?? `unknown:${r.id}`;
 const completeness=(r:DataCenter)=>[r.name,r.operator,r.city,r.address,r.powerCapacityMw,r.status].filter(v=>v!==null && v!=="").length;
 const rank=(a:DataCenter,b:DataCenter)=>Number(aliases.has(b.operator?.toLowerCase() ?? ""))-Number(aliases.has(a.operator?.toLowerCase() ?? "")) || (b.powerCapacityMw ?? -1)-(a.powerCapacityMw ?? -1) || completeness(b)-completeness(a) || a.id.localeCompare(b.id);
 const eligible=records.filter(hasValidCoordinates); const byCountry=new Map<string,DataCenter[]>();
 for(const r of eligible){const c=r.countryCode ?? "ZZ";if(!byCountry.has(c))byCountry.set(c,[]);byCountry.get(c)!.push(r);}
 const countries=[...byCountry.keys()].sort();
 if(target<countries.length || target>eligible.length) throw new Error("Target must cover every country and not exceed eligible records");
 for(const rows of byCountry.values()) rows.sort(rank);
 const quota=new Map(countries.map(c=>[c,1]));let remaining=target-countries.length;
 while(remaining>0){
  const open=countries.filter(c=>quota.get(c)!<byCountry.get(c)!.length); const weight=open.reduce((s,c)=>s+Math.sqrt(byCountry.get(c)!.length),0);
  const allocation=open.map(c=>{const ideal=remaining*Math.sqrt(byCountry.get(c)!.length)/weight;return {c,n:Math.min(Math.floor(ideal),byCountry.get(c)!.length-quota.get(c)!),fraction:ideal%1};});
  for(const {c,n} of allocation){quota.set(c,quota.get(c)!+n);remaining-=n;}
  for(const {c} of allocation.sort((a,b)=>b.fraction-a.fraction || a.c.localeCompare(b.c))){if(!remaining)break;if(quota.get(c)!<byCountry.get(c)!.length){quota.set(c,quota.get(c)!+1);remaining--;}}
 }
 const used=new Set<string>(),counts=new Map<string,number>(),selected:DataCenter[]=[];const cap=Math.max(1,Math.floor(target*.1));
 const add=(r:DataCenter)=>{const group=groupOf(r);if(used.has(r.id)||(counts.get(group) ?? 0)>=cap)return false;used.add(r.id);counts.set(group,(counts.get(group) ?? 0)+1);selected.push(r);return true;};
 // Reserve a representative before filling larger countries, subject to the operator cap.
 for(const c of countries){const r=byCountry.get(c)!.find(r=>(counts.get(groupOf(r)) ?? 0)<cap);if(!r)throw new Error(`Cannot represent ${c} within operator cap`);add(r);}
 for(const c of countries){let n=selected.filter(r=>(r.countryCode ?? "ZZ")===c).length;for(const r of byCountry.get(c)!){if(n>=quota.get(c)!)break;if(add(r))n++;}}
 for(const r of [...eligible].sort(rank)){if(selected.length===target)break;add(r);}
 if(selected.length!==target)throw new Error("Not enough candidates within the operator cap");
 return selected.sort((a,b)=>(a.countryCode ?? "ZZ").localeCompare(b.countryCode ?? "ZZ") || rank(a,b)).map((facility,i)=>({facility,group:groupOf(facility),country:facility.countryCode ?? "ZZ",priority:i+1,batch:Math.floor(i/100)+1}));
}
