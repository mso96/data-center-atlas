import { NextRequest, NextResponse } from "next/server";
import { openRepository } from "@/data";
import { hasValidCoordinates } from "@/domain/data-center";
import { returnQuery } from "@/domain/detail-navigation";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(request:NextRequest,{params}:{params:Promise<{id:string}>}) {
 const {id}=await params;
 const context=openRepository();
 const facility=await (async()=>{try{return await context.repository.getById(id);}finally{context.close();}})();
 if(!facility?.detailPath || !hasValidCoordinates(facility)) return new NextResponse("Facility not found",{status:404});
 const destination=new URL(facility.detailPath,request.url);
 const tab=request.nextUrl.searchParams.get("tab");
 if(tab && ["location","specs","overview"].includes(tab)) destination.searchParams.set("tab",tab);
 const back=request.nextUrl.searchParams.get("return");
 if(back) destination.searchParams.set("return",returnQuery(back,id));
 return new NextResponse(null,{status:308,headers:{Location:destination.pathname+destination.search}});
}
