"use client";
import { ErrorState } from "@/components/explorer/states";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <ErrorState message="Facility data is unavailable. Check the database setup or try again." onRetry={reset} />;
}
