import { parseQuery, serializeQuery } from "./explorer-query";
/** Return navigation only accepts explorer parameters, never an arbitrary redirect URL. */
export function returnQuery(value: string | undefined, selectedId: string) {
 const query=parseQuery(new URLSearchParams(value ?? ""));
 return serializeQuery({...query,selectedId});
}
export function detailHref(id: string, query: string) {
 return `/data-centers/${encodeURIComponent(id)}?${new URLSearchParams({return:returnQuery(query,id)})}`;
}
