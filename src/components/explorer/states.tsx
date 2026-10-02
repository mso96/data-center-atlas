import { Button } from "@/components/ui/button";
export function LoadingState({ message = "Loading facilities…" }: { message?: string }) {
  return <div className="state-panel" role="status"><span className="loading-dot" />{message}</div>;
}
export function EmptyState() {
  return <div className="state-panel"><h3>No facilities to show</h3><p>Try another view when more data is available.</p></div>;
}
export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return <div className="state-panel" role="alert"><h3>Unable to load this view</h3><p>{message}</p>{onRetry && <Button variant="outline" size="sm" onClick={onRetry}>Try again</Button>}</div>;
}
