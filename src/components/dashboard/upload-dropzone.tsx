"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { errorMessage } from "@/lib/error-codes";
import { UploadCloud, ShieldAlert, FileText, Loader2, AlertCircle, X } from "lucide-react";

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
      <div className="rounded-[10px] border border-[#D8D2C6] bg-[#FFFDF7] p-6 shadow-xs">
        <div className="flex items-start gap-4">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[6px] bg-[#B87316]/10 text-[#B87316]">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <h4 className="font-mono text-[11px] font-bold text-[#171714] uppercase tracking-wider mb-1">
              Privacy & Document Processing Notice
            </h4>
            <p className="text-[13px] leading-relaxed text-[#646158] mb-3.5">
              Agreements are parsed through private, secure infrastructure to extract page-level citations, detect omissions, and generate redlines. You can request complete hard-purge of stored files at any time.
            </p>
            <label className="inline-flex items-center gap-2.5 text-[13px] font-semibold text-[#171714] cursor-pointer hover:text-[#F04D35] transition-colors">
              <input
                type="checkbox"
                onChange={(e) => {
                  window.localStorage.setItem(
                    CONSENT_KEY,
                    e.target.checked ? "1" : "0"
                  );
                  setOverride(e.target.checked);
                }}
                className="h-4 w-4 rounded-[4px] border-[#D8D2C6] text-[#F04D35] focus:ring-[#3157D5] cursor-pointer"
              />
              <span>I understand and agree to proceed with document analysis</span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        id="upload-dropzone"
        role="button"
        tabIndex={0}
        aria-label="Upload PDF document"
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && inputRef.current?.click()}
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
        className={`group relative cursor-pointer rounded-[10px] border-2 border-dashed p-8 sm:p-10 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5] ${
          dragging
            ? "border-[#F04D35] bg-[#F04D35]/5 ring-2 ring-[#F04D35]/20"
            : "border-[#D8D2C6] bg-[#FFFDF7] hover:border-[#989388] hover:bg-[#FFFDF7]"
        }`}
      >
        {busy ? (
          <div className="flex flex-col items-center justify-center py-4" role="status" aria-live="polite">
            <div className="flex h-12 w-12 items-center justify-center rounded-[8px] bg-[#F04D35]/10 text-[#F04D35] mb-3">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
            <p className="font-['Georgia',serif] text-base font-bold text-[#171714]">
              Uploading & processing agreement…
            </p>
            <p className="font-mono text-[11px] text-[#646158] mt-1">
              Extracting pages, cross-checking citations & auditing omissions
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-[8px] border border-[#D8D2C6] bg-[#F3F0E8] text-[#171714] transition-all group-hover:scale-105 group-hover:border-[#F04D35] group-hover:text-[#F04D35]">
              <UploadCloud className="h-6 w-6" />
            </div>

            <h3 className="font-['Georgia',serif] text-lg font-bold text-[#171714]">
              Upload an agreement for verified analysis
            </h3>
            <p className="mt-1 text-[13px] text-[#646158]">
              Drag & drop your PDF contract, offer letter, or NDA here, or click to browse
            </p>

            <div className="mt-4 inline-flex items-center gap-2 rounded-[6px] bg-[#F04D35] px-5 py-2.5 text-[13px] font-bold text-[#FFFDF7] shadow-xs transition-all hover:bg-[#C93625] active:scale-[0.96]">
              <FileText className="h-4 w-4" />
              <span>Choose PDF File</span>
            </div>

            <p className="mt-4 font-mono text-[11px] text-[#989388]">
              PDF format · Up to 20 MB · Character-level citation verification
            </p>
          </div>
        )}

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="sr-only"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </div>

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-center justify-between rounded-[6px] border border-[#C53B36]/30 bg-[#FFFDF7] px-4 py-3 text-[12px] text-[#C53B36]"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0 text-[#C53B36]" />
            <span className="font-medium">{error}</span>
          </div>
          <button
            type="button"
            onClick={() => setError(null)}
            className="text-[#989388] hover:text-[#171714] font-bold ml-2 p-1"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
