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
        <span role="alert" className="font-mono text-[11px] text-[#C53B36]">
          {error}
        </span>
      )}
      {status === "failed" && (
        <button
          type="button"
          onClick={handleRetry}
          disabled={busy !== null}
          className="rounded-[6px] border border-[#D8D2C6] bg-[#FFFDF7] px-3 py-1 font-mono text-[11px] font-bold text-[#171714] transition-colors hover:bg-[#F3F0E8] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]"
        >
          {busy === "retry" ? "Retrying…" : "Retry"}
        </button>
      )}
      <button
        type="button"
        onClick={handleDelete}
        disabled={busy !== null}
        className="rounded-[6px] border border-[#D8D2C6] bg-[#FFFDF7] px-3 py-1 font-mono text-[11px] font-bold text-[#646158] transition-colors hover:border-[#C53B36] hover:bg-[#C53B36]/10 hover:text-[#C53B36] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C53B36]"
      >
        {busy === "delete" ? "Deleting…" : "Delete"}
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
      className={`inline-flex items-center gap-1.5 rounded-[4px] px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${
        status === "ready"
          ? "border border-[#2E7D4F]/30 bg-[#2E7D4F]/10 text-[#2E7D4F]"
          : status === "failed"
            ? "border border-[#C53B36]/30 bg-[#C53B36]/10 text-[#C53B36]"
            : "border border-[#B87316]/30 bg-[#B87316]/10 text-[#B87316]"
      }`}
    >
      {active && (
        <span className="h-1.5 w-1.5 animate-ping rounded-full bg-[#B87316]" />
      )}
      {status === "ready" && "Ready"}
      {status === "queued" && "Queued…"}
      {status === "extracting" && "Extracting…"}
      {status === "analyzing" && "Analyzing…"}
      {status === "failed" && "Failed"}
    </span>
  );
}
