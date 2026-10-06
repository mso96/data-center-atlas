import type { PublicFacility } from "../data/repository";
import { parseQuery, serializeQuery } from "./explorer-query";
/** Return navigation only accepts explorer parameters, never an arbitrary redirect URL. */
export function returnQuery(value: string | undefined, selectedId: string) {
 const query=parseQuery(new URLSearchParams(value ?? ""));
 return serializeQuery({...query,selectedId});
}
export function detailHref(facility: Pick<PublicFacility,"id"|"detailPath">, query: string) {
 return `${facility.detailPath ?? `/data-centers/${encodeURIComponent(facility.id)}`}?${new URLSearchParams({return:returnQuery(query,facility.id)})}`;
}
