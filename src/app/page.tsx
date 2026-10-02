import { AppShell } from "@/components/layout/app-shell";
import { openRepository } from "@/data";
import { loadExplorer } from "@/data/explorer";
import { parseQuery } from "@/domain/explorer-query";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export default async function Home({searchParams}: {searchParams: Promise<Record<string,string|string[]|undefined>>}) {
  const params = new URLSearchParams();
  for (const [key,value] of Object.entries(await searchParams)) if(typeof value === "string") params.set(key,value);
  const context = openRepository();
  try { return <AppShell initial={await loadExplorer(context.repository,parseQuery(params),context.mode)} />; }
  finally { context.close(); }
}
