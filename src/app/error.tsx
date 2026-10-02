"use client";
import { ErrorState } from "@/components/explorer/states";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return <ErrorState message="The demo facilities could not be loaded." onRetry={reset} />;
}
