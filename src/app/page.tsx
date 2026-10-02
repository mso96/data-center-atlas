import { AppShell } from "@/components/layout/app-shell";
import { dataCenterRepository } from "@/data";
export default async function Home() {
  const [page, options, features] = await Promise.all([
    dataCenterRepository.list({}, { pageSize: 100 }),
    dataCenterRepository.getFilterOptions(),
    dataCenterRepository.getMapFeatures(),
  ]);
  return <AppShell facilities={page.items} options={options} features={features} />;
}
