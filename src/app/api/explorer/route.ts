import { openRepository } from "@/data";
import { loadExplorer } from "@/data/explorer";
import { parseQuery } from "@/domain/explorer-query";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const context = openRepository();
    try {
      const result = await loadExplorer(context.repository,parseQuery(new URL(request.url).searchParams),context.mode,context.dataset);
      return Response.json(result,{headers:{"Cache-Control":"no-store"}});
    } finally { context.close(); }
  } catch(error) {
    console.error("Explorer data unavailable:",error instanceof Error ? error.message : error);
    return Response.json({error:"Facility data is unavailable. Retry, or ask the administrator to check the database setup."},{status:503,headers:{"Cache-Control":"no-store"}});
  }
}
