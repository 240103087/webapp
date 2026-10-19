import type { ReactNode } from "react";
import { ApiError } from "../api";
import { Button } from "./Button";

/** No connection (0) or a server failure (5xx): trying again may help. */
export function isRetryable(e: unknown): boolean {
  return !(e instanceof ApiError) || e.status === 0 || e.status >= 500;
}

/** The message to show for a failed load; `notFound` replaces the server's 404 text. */
export function loadErrorMessage(e: unknown, notFound?: string): string {
  if (e instanceof ApiError) return e.status === 404 && notFound ? notFound : e.message;
  return "Something went wrong. Try again.";
}

/** A failed page load: the message, Retry when it can help, and an optional way out (#37). */
export function LoadError({ error, notFound, onRetry, children }: { error: unknown; notFound?: string; onRetry: () => void; children?: ReactNode }) {
  return (
    <div className="alert" role="alert">
      <span>{loadErrorMessage(error, notFound)}</span>{" "}
      {isRetryable(error) && <Button size="sm" onClick={onRetry}>Retry</Button>} {children}
    </div>
  );
}
