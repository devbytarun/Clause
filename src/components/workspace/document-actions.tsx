"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { errorMessage } from "@/lib/error-codes";

export function DocumentActions({
  documentId,
  status,
}: {
  documentId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<null | "retry" | "delete">(null);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!window.confirm("Permanently delete this document and its analysis?")) {
      return;
    }
    setBusy("delete");
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error?.message ?? "Delete failed");
      }
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
      setBusy(null);
    }
  }

  async function handleRetry() {
    setBusy("retry");
    setError(null);
    try {
      const res = await fetch(`/api/documents/${documentId}/retry`, {
        method: "POST",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error?.message ?? errorMessage("rate_limited") ?? "Retry failed"
        );
      }
      router.refresh();
      // Polling resumes; refresh again shortly to pick up new status.
      setTimeout(() => router.refresh(), 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Retry failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex items-center gap-2">
      {error && (
        <span role="alert" className="text-xs text-primary-deep">
          {error}
        </span>
      )}
      {status === "failed" && (
        <button
          type="button"
          onClick={handleRetry}
          disabled={busy !== null}
          className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm font-medium no-underline transition-colors hover:bg-surface disabled:text-muted"
        >
          {busy === "retry" ? "Retrying…" : "Retry"}
        </button>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy !== null}
        className="rounded-md border border-hairline-strong px-3 py-1.5 text-sm font-medium text-primary-deep no-underline transition-colors hover:bg-surface disabled:text-muted"
      >
        Delete
      </button>
    </div>
  );
}

/** Lightweight status poller — refreshes while processing is in flight. */
export function StatusPoller({
  status,
  intervalMs = 2500,
}: {
  status: string;
  intervalMs?: number;
}) {
  const router = useRouter();
  const active =
    status === "queued" || status === "extracting" || status === "analyzing";

  if (typeof window !== "undefined" && active) {
    setTimeout(() => router.refresh(), intervalMs);
  }

  return (
    <span
      role="status"
      aria-live="polite"
      className="rounded-full bg-cream px-2.5 py-1 text-xs font-semibold uppercase tracking-wide text-ink-tint"
    >
      {status === "queued" && "Queued…"}
      {status === "extracting" && "Extracting text…"}
      {status === "analyzing" && "Analyzing…"}
      {status === "ready" && "Ready"}
      {status === "failed" && "Failed"}
    </span>
  );
}
