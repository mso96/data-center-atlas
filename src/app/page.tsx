import { AppShell } from "@/components/layout/app-shell";
import { dataCenterRepository } from "@/data";

export default async function Home() {
  const { total } = await dataCenterRepository.list();
  return <AppShell demoCount={total} />;
}
