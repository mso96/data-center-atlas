import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight, Globe2, MapPin, Server, Zap, Check, BookOpen } from "lucide-react";
import { openRepository } from "@/data";
import { hasValidCoordinates } from "@/domain/data-center";
import { returnQuery } from "@/domain/detail-navigation";
import type { ResearchFact,ResearchProfile } from "@/domain/research/profile";
import { LocationMap } from "@/components/facility/location-map";
export const runtime="nodejs";
export const dynamic="force-dynamic";
type Props={params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>};
const tabs=["overview","specs","location"] as const;
function Citations({fact,profile}:{fact:ResearchFact;profile:ResearchProfile}){
 return <span className="fact-citations">{fact.sourceIds.map(id=>{const source=profile.sources.find(s=>s.id===id)!;return <a key={id} href={source.url} target="_blank" rel="noreferrer" title={source.title} aria-label={`Source for ${fact.label}: ${source.title}`}><ArrowUpRight size={12}/></a>;})}</span>;
}
export default async function FacilityPage({params,searchParams}:Props){
 const [{id},search]=await Promise.all([params,searchParams]);
 const context=openRepository();
 const [facility,profile]=await (async()=>{try{return [await context.repository.getById(id),context.getResearch(id)] as const;}finally{context.close();}})();
 if(!facility || !hasValidCoordinates(facility))notFound();
 const tab=typeof search.tab==="string" && tabs.includes(search.tab as typeof tabs[number]) ? search.tab : "overview";
 const backQuery=returnQuery(typeof search.return==="string"?search.return:undefined,id);
 const backHref=`/?${backQuery}`;
 const href=(next:string)=>`/data-centers/${encodeURIComponent(id)}?${new URLSearchParams({tab:next,return:backQuery})}`;
 const facts=profile?.status==="reviewed" ? profile.facts.filter(f=>f.status==="verified") : [];
 const sectionFacts=facts.filter(f=>f.section===tab || (tab==="specs" && f.category==="Services"));
 const aliases=profile?.aliases.filter(alias=>alias.trim().toLowerCase()!==facility.name.trim().toLowerCase()) ?? [];
 const isRing=facility.sourceUrl?.startsWith("https://github.com/Ringmast4r/Global-Data-Center-Map/");
 const dataset=isRing ? {label:"Data centers (c) Ringmast4r — Global-Data-Center-Map",url:"https://github.com/Ringmast4r/Global-Data-Center-Map",notice:"Locations may be city or regional centroids; not verified building locations."}:null;
 const baseSpecs=[
  ["Power capacity",facility.powerCapacityMw!==null?`${facility.powerCapacityMw.toLocaleString("en-US")} MW`:null],
  ["Facility area",facility.facilityAreaSqM!==null?`${facility.facilityAreaSqM.toLocaleString("en-US")} m²`:null],
  ["PUE",facility.pue], ["Tier",facility.tier?.level], ["Certification",facility.tier?.certification], ["Operational since",facility.operationalYear],
 ].filter(([,value])=>value!==null && value!==undefined && value!=="");
 const location=[facility.city,facility.country].filter(Boolean).join(", ");
 return <div className="profile-page">
  <header className="atlas-header"><Link className="wordmark" href={backHref}><Globe2 size={20}/><span>Data Center <strong>Atlas</strong></span></Link><Link className="profile-back" href={backHref}><ArrowLeft size={14}/>Back to map</Link></header>
  <main className="profile-main">
   <div className="profile-breadcrumb"><Link href={backHref}>Explore</Link><span>/</span><span>{facility.country ?? "Data center"}</span></div>
   <section className="profile-hero"><div><p className="eyebrow">DATA CENTER</p><h1>{facility.name.replace(/^Demo — /,"")}</h1>{location && <p className="profile-location"><MapPin size={16}/>{location}</p>}
    <div className="profile-badges">{facility.operator && <span><Server size={13}/>{facility.operator}</span>}{facility.status && <span className="profile-status">{facility.status.replaceAll("-"," ")}</span>}{facility.isDemo && <span>Fictional demo facility</span>}</div>
   </div><div className="profile-research-label"><BookOpen size={16}/>{facts.length ? "Official sources added" : "Dataset profile"}</div></section>
   <nav className="profile-tabs" aria-label="Facility sections">{tabs.map(t=><Link prefetch={false} key={t} href={href(t)} aria-current={tab===t?"page":undefined}>{t.charAt(0).toUpperCase()+t.slice(1)}</Link>)}</nav>
   <div className="profile-columns"><article className="profile-content">
    {tab==="overview" && <>
     <h2>About this facility</h2>
     {sectionFacts.filter(f=>f.category==="Summary").map(f=><p className="profile-summary" key={f.id}>{f.value}<Citations fact={f} profile={profile!}/></p>)}
     {!sectionFacts.some(f=>f.category==="Summary") && <p className="profile-summary">{!isRing && facility.description ? facility.description : "An extended overview has not yet been verified from official sources."}</p>}
     {facts.some(f=>f.category==="Services") && <section className="profile-block"><h2>Services</h2><div className="profile-services">{facts.filter(f=>f.category==="Services").map(f=><span key={f.id}><Check size={14}/>{f.value}<Citations fact={f} profile={profile!}/></span>)}</div></section>}
     {sectionFacts.filter(f=>!["Summary","Services"].includes(f.category)).map(f=><section className="profile-block" key={f.id}><h2>{f.label}</h2><p>{f.value}<Citations fact={f} profile={profile!}/></p></section>)}
     {aliases.length ? <p className="profile-note">Also known as: {aliases.join(", ")}</p>:null}
    </>}
    {tab==="specs" && <>
     {sectionFacts.length===0 && baseSpecs.length===0 && <p className="profile-empty">Technical specifications have not been provided or verified for this facility.</p>}
     {sectionFacts.length>0 && [...new Set(sectionFacts.map(f=>f.category))].map(category=><section key={category} className="profile-block"><h2>{category}</h2><dl className="profile-specs">{sectionFacts.filter(f=>f.category===category).map(f=><div key={f.id}><dt>{f.label}</dt><dd>{f.value}<Citations fact={f} profile={profile!}/></dd></div>)}</dl></section>)}
     {baseSpecs.length>0 && <section className="profile-block"><h2><Zap size={16}/> Imported specifications</h2><p className="profile-note">Reported in the source dataset; scope and current availability are not independently verified.</p><dl className="profile-specs">{baseSpecs.map(([label,value])=><div key={String(label)}><dt>{label}</dt><dd>{value}</dd></div>)}</dl></section>}
    </>}
    {tab==="location" && <><h2>Location</h2>{facility.address && <p className="profile-summary">{facility.address}</p>}<p className="profile-note">This map uses the imported location. It may identify a city or regional centre rather than the facility building.</p><LocationMap facility={facility} dataset={dataset}/>{sectionFacts.map(f=><p className="profile-note" key={f.id}>{f.value}<Citations fact={f} profile={profile!}/></p>)}</>}
   </article><aside className="profile-aside" aria-label="Facility information"><h2>At a glance</h2><dl>{[["Operator",facility.operator],["Country",facility.country],["City",facility.city],["Address",facility.address]].filter(([,v])=>v).map(([label,value])=><div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl><p className="profile-note">Only available information is shown. Source details may change over time.</p></aside></div>
   <footer className="profile-sources"><h2>Sources & attribution</h2>{facility.sourceUrl && <a href={facility.sourceUrl} target="_blank" rel="noreferrer">{isRing ? "Data centers © Ringmast4r — Global-Data-Center-Map" : "Source dataset"}<ArrowUpRight size={13}/></a>}{isRing && <p>Imported snapshot. Coordinates may be approximate.</p>}{profile?.sources.map(s=><div key={s.id}><a href={s.url} target="_blank" rel="noreferrer">{s.title}<ArrowUpRight size={13}/></a><p>Accessed {s.accessedAt}{s.publishedAt ? ` · Published ${s.publishedAt}` : ""}</p></div>)}</footer>
  </main>
 </div>;
}
