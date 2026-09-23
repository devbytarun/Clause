"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Trash2, 
  ArrowUpRight, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  FilePlus, 
  Layers 
} from "lucide-react";
import { removeCachedPdf } from "@/lib/client/idb-pdf-cache";

export interface DocumentItem {
  id: string;
  originalFilename: string;
  status: string;
  pageCount: number | null;
  createdAt: string | Date;
}

function StatusChip({ status }: { status: string }) {
  const isReady = status === "ready";
  const isFailed = status === "failed";

  if (isReady) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#2E7D4F]/30 bg-[#2E7D4F]/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-[#2E7D4F]">
        <CheckCircle2 className="h-3 w-3" />
        Verified & Ready
      </span>
    );
  }

  if (isFailed) {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#C53B36]/30 bg-[#C53B36]/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-[#C53B36]">
        <AlertCircle className="h-3 w-3" />
        Analysis Failed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-[4px] border border-[#B87316]/30 bg-[#B87316]/10 px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase text-[#B87316]">
      <Loader2 className="h-3 w-3 animate-spin" />
      {status === "queued" && "Queued"}
      {status === "extracting" && "Extracting…"}
      {status === "analyzing" && "Analyzing…"}
    </span>
  );
}

function formatDate(dateInput: string | Date): string {
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "Recently";
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24 && d.getDate() === now.getDate()) {
    return "Today, " + d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: d.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

export function DocumentList({
  items,
  nextCursor,
  onUploadClick,
}: {
  items: DocumentItem[];
  nextCursor?: string | null;
  onUploadClick?: () => void;
}) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, id: string, filename: string) {
    e.preventDefault();
    e.stopPropagation();

    if (!window.confirm(`Permanently delete "${filename}" and all extracted evidence?`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch("/api/documents/" + id, { method: "DELETE" });
      if (res.ok) {
        await removeCachedPdf(id).catch(() => undefined);
        router.refresh();
      }
    } catch {
      // Ignored
    } finally {
      setDeletingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <div className="rounded-[10px] border border-[#D8D2C6] bg-[#FFFDF7] p-12 text-center shadow-2xs">
        <div className="mx-auto mb-3.5 flex h-12 w-12 items-center justify-center rounded-[8px] border border-[#D8D2C6] bg-[#F3F0E8] text-[#171714]">
          <FileText className="h-6 w-6" />
        </div>
        <h3 className="font-['Georgia',serif] text-lg font-bold text-[#171714]">
          No agreements uploaded yet
        </h3>
        <p className="mx-auto mt-1 max-w-md text-[13px] leading-relaxed text-[#646158]">
          Upload an employment contract, NDA, or service agreement to inspect verified citations, missing protections, and counter-proposals.
        </p>
        {onUploadClick && (
          <button
            type="button"
            onClick={onUploadClick}
            className="mt-5 inline-flex items-center gap-2 rounded-[6px] bg-[#F04D35] px-5 py-2.5 text-[13px] font-bold text-[#FFFDF7] transition-all hover:bg-[#C93625]"
          >
            <FilePlus className="h-4 w-4" />
            <span>Upload Agreement PDF</span>
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((doc) => {
        const isDeleting = deletingId === doc.id;
        return (
          <div
            key={doc.id}
            className={`group relative flex flex-col gap-4 rounded-[8px] border border-[#D8D2C6] bg-[#FFFDF7] p-4 sm:p-5 transition-all hover:border-[#989388] shadow-2xs sm:flex-row sm:items-center sm:justify-between ${
              isDeleting ? "opacity-40 pointer-events-none" : ""
            }`}
          >
            {/* Left: Document details */}
            <div className="flex items-start gap-3.5 min-w-0 flex-1">
              <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] border border-[#D8D2C6] bg-[#F3F0E8] text-[#171714] transition-all group-hover:border-[#171714]">
                <FileText className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <Link
                  href={"/documents/" + doc.id}
                  className="block truncate font-sans text-[15px] font-semibold tracking-tight text-[#171714] no-underline transition-colors hover:text-[#F04D35]"
                  title={doc.originalFilename}
                >
                  {doc.originalFilename}
                </Link>

                <div className="mt-1 flex flex-wrap items-center gap-2 font-sans text-[11px] text-[#646158]">
                  <span className="font-bold text-[#171714] bg-[#F3F0E8] px-1.5 py-0.2 rounded-[3px] border border-[#D8D2C6]">
                    PDF
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Layers className="h-3 w-3 text-[#989388]" />
                    {doc.pageCount
                      ? doc.pageCount + (doc.pageCount === 1 ? " page" : " pages")
                      : "Pages pending"}
                  </span>
                  <span>·</span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-[#989388]" />
                    {formatDate(doc.createdAt)}
                  </span>
                </div>
              </div>
            </div>

            {/* Right: Status & Actions */}
            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-3 sm:pt-0 border-t sm:border-t-0 border-[#D8D2C6]/60">
              <StatusChip status={doc.status} />

              <div className="flex items-center gap-2">
                <Link
                  href={"/documents/" + doc.id}
                  className="inline-flex h-[36px] items-center gap-1.5 rounded-[6px] border border-[#D8D2C6] bg-[#FFFDF7] px-3.5 text-[12px] font-bold text-[#171714] no-underline transition-all hover:bg-[#171714] hover:text-[#FFFDF7]"
                >
                  <span>Open Workspace</span>
                  <ArrowUpRight className="h-3.5 w-3.5" />
                </Link>

                <button
                  type="button"
                  onClick={(e) => handleDelete(e, doc.id, doc.originalFilename)}
                  title="Delete document"
                  aria-label={"Delete " + doc.originalFilename}
                  className="flex h-[36px] w-[36px] items-center justify-center rounded-[6px] border border-[#D8D2C6] bg-[#FFFDF7] text-[#646158] transition-all hover:border-[#C53B36] hover:bg-[#C53B36]/10 hover:text-[#C53B36]"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}

      {nextCursor && (
        <p className="pt-3 text-center font-mono text-[11px] text-[#989388]">
          Showing {items.length} most recent documents.
        </p>
      )}
    </div>
  );
}
