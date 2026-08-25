"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { errorMessage } from "@/lib/error-codes";

const CONSENT_KEY = "clause-upload-consent-v1";

const noopSubscribe = () => () => undefined;

export function UploadDropzone() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const storedConsent = useSyncExternalStore(
    noopSubscribe,
    () => window.localStorage.getItem(CONSENT_KEY) === "1",
    () => false
  );
  const [override, setOverride] = useState<boolean | null>(null);
  const consent = override ?? storedConsent;
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setError(null);
    setBusy(true);
    try {
      const form = new FormData();
      form.append("file", file);
      let res = await fetch("/api/documents", { method: "POST", body: form });

      if (res.status === 409) {
        const body = await res.json().catch(() => null);
        const proceed = window.confirm(
          `${body?.message ?? "Duplicate detected."}\n\nStore another copy?`
        );
        if (!proceed) {
          setBusy(false);
          return;
        }
        res = await fetch("/api/documents?confirm=1", {
          method: "POST",
          body: form,
        });
      }

      if (res.status === 201) {
        const body = await res.json();
        router.push(`/documents/${body.id}`);
        return;
      }

      const errBody = await res.json().catch(() => null);
      throw new Error(
        errBody?.error?.message ?? errorMessage("bad_request") ?? "Upload failed"
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function handleFiles(files: FileList | null) {
    const file = files?.[0];
    if (!file) return;
    void upload(file);
  }

  if (!consent) {
    return (
      <div className="rounded-lg border border-beige-deep bg-cream p-6">
        <p className="mb-3 text-sm leading-relaxed text-ink-tint">
          Documents are processed through cloud infrastructure and an external
          AI service. Don&apos;t upload information you&apos;re not comfortable
          transmitting to those services.
        </p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            onChange={(e) => {
              window.localStorage.setItem(
                CONSENT_KEY,
                e.target.checked ? "1" : "0"
              );
              setOverride(e.target.checked);
            }}
            className="h-4 w-4"
          />
          I understand and want to continue
        </label>
      </div>
    );
  }

  return (
    <div>
      <div
        role="button"
        tabIndex={0}
        aria-label="Upload PDF"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`cursor-pointer rounded-lg border border-dashed p-10 text-center transition-colors ${
          dragging ? "border-primary bg-cream-light" : "border-hairline-strong bg-surface hover:bg-canvas"
        }`}
      >
        {busy ? (
          <p className="text-sm font-medium" role="status" aria-live="polite">
            Uploading…
          </p>
        ) : (
          <>
            <p className="mb-1 font-medium">Upload a PDF</p>
            <p className="text-xs text-steel">
              Offers, NDAs, agreements · up to 20 MB · up to 120 pages
            </p>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-sm text-primary-deep">
          {error}
        </p>
      )}
    </div>
  );
}
