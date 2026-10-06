import { z } from "zod";
const text=z.string().trim().min(1).max(3000);
export const researchSourceSchema=z.object({id:text,url:z.url().refine(s=>new URL(s).protocol==="https:","Use an HTTPS primary source"),title:text,accessedAt:z.iso.date(),publishedAt:z.iso.date().nullable()}).strict();
export const researchFactSchema=z.object({id:text,section:z.enum(["overview","specs","location"]),category:z.enum(["Summary","Services","History","Capacity","Power","Cooling","Connectivity","Security","Compliance","Location"]),label:text,value:text,sourceIds:z.array(text).min(1),status:z.enum(["verified","conflicting"]).default("verified")}).strict();
export const researchProfileSchema=z.object({facilityId:text,status:z.enum(["pending","in-progress","reviewed"]),reviewNote:text,
 identity:z.object({nameMatched:z.boolean(),operatorMatched:z.boolean(),addressMatched:z.boolean(),notes:text}).strict(),
 website:z.object({url:z.url().refine(s=>new URL(s).protocol==="https:","Use an HTTPS website"),label:text,kind:z.enum(["facility","operator","host-facility"]),sourceIds:z.array(text).min(1)}).nullable().default(null),
 aliases:z.array(text).default([]), sources:z.array(researchSourceSchema),facts:z.array(researchFactSchema),
}).strict().superRefine((p,ctx)=>{
 const ids=new Set(p.sources.map(s=>s.id));
 if(ids.size!==p.sources.length || new Set(p.facts.map(f=>f.id)).size!==p.facts.length) ctx.addIssue({code:"custom",message:"Duplicate source/fact IDs"});
 if(p.facts.some(f=>f.sourceIds.some(id=>!ids.has(id)))) ctx.addIssue({code:"custom",message:"Every fact must cite a source in this profile"});
 if(p.facts.some(f=>f.status==="verified") && (!p.identity.nameMatched || !p.identity.operatorMatched || !p.identity.addressMatched)) ctx.addIssue({code:"custom",message:"Published facts require name, operator and address identity checks"});
 if(p.website && (p.website.sourceIds.some(id=>!ids.has(id)) || !p.identity.nameMatched || !p.identity.operatorMatched || !p.identity.addressMatched)) ctx.addIssue({code:"custom",message:"Website requires cited identity evidence"});
 if(p.status==="reviewed" && !p.sources.length) ctx.addIssue({code:"custom",message:"A completed review requires the official sources checked, even if no usable facts were found"});
});
export type ResearchProfile=z.infer<typeof researchProfileSchema>;
export type ResearchFact=z.infer<typeof researchFactSchema>;
