"use client";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import type { DataCenter } from "@/domain/data-center";
import type { MapFeatures } from "@/data/repository";
import type { DatasetCredit } from "@/data/explorer";
const WorldMap=dynamic(()=>import("@/components/map/world-map"),{ssr:false,loading:()=> <p className="profile-empty">Loading location map…</p>});
const ignoreSelection=()=>{};
export function LocationMap({facility,dataset}:{facility:DataCenter;dataset:DatasetCredit|null}){
 const features=useMemo<MapFeatures>(()=>({type:"FeatureCollection",matchingCount:1,missingCoordinatesCount:0,features:[{type:"Feature",id:facility.id,geometry:{type:"Point",coordinates:[facility.longitude!,facility.latitude!]},properties:{id:facility.id,name:facility.name,operator:facility.operator,status:facility.status,isDemo:facility.isDemo}}]}),[facility]);
 return <div className="profile-map"><WorldMap features={features} selected={facility} onSelect={ignoreSelection} mode={facility.isDemo ? "demo":"imported"} dataset={dataset} /></div>;
}
