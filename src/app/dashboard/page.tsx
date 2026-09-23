import type { Metadata } from "next";
import Link from "next/link";
import { UploadDropzone } from "@/components/dashboard/upload-dropzone";
import { DocumentList } from "@/components/dashboard/document-list";
import { getSessionUser } from "@/lib/session";
import { listDocumentsForUser } from "@/lib/documents/repository";
import { FileText, CheckCircle2, FolderOpen } from "lucide-react";

export const metadata: Metadata = { title: "Documents — Clause" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) throw new Error("Local workspace database is unavailable");

  const list = await listDocumentsForUser(user.id);
  const totalDocs = list.items.length;
  const readyDocs = list.items.filter((d) => d.status === "ready").length;

  return (
    <main className="flex min-h-screen w-full flex-col bg-[#F3F0E8] text-[#171714] font-sans antialiased overflow-x-hidden">
      {/* Application Navigation Header — Edge to Edge */}
      <header className="sticky top-0 z-30 w-full border-b border-[#D8D2C6] bg-[#FFFDF7] shadow-2xs">
        <div className="flex h-16 w-full items-center justify-between px-6 sm:px-10 lg:px-14 xl:px-16">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="font-['Georgia',serif] text-2xl font-bold tracking-tight text-[#171714] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]"
            >
              Clause<span className="text-[#F04D35]">.</span>
            </Link>

            <nav className="hidden items-center gap-5 border-l border-[#D8D2C6] pl-5 text-[13px] font-semibold sm:flex" aria-label="Workspace navigation">
              <Link href="/" className="text-[#646158] no-underline transition-colors hover:text-[#171714]">Home</Link>
              <span aria-current="page" className="text-[#171714]">Documents</span>
            </nav>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 rounded-[4px] border border-[#D8D2C6] bg-[#FFFDF7] px-2.5 py-1 text-[12px] font-mono text-[#646158]">
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#F04D35] text-[10px] font-bold text-[#FFFDF7]">
                {user.email.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-[130px] truncate font-medium text-[#171714] sm:max-w-xs">Local workspace</span>
            </div>
            <span className="hidden text-[11px] font-mono text-[#646158] md:inline">Saved locally</span>
          </div>
        </div>
      </header>

      {/* Main Content Area — Full width stretched to corners */}
      <div className="w-full flex-1 px-6 sm:px-10 lg:px-14 xl:px-16 py-8 flex flex-col gap-8">
        {/* Page Title & Stats */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-6 border-b border-[#D8D2C6]">
          <div>
            <div className="inline-flex items-center gap-2 font-mono text-[11px] font-bold text-[#646158] uppercase tracking-[0.12em] mb-1.5">
              <span>ISSUE #01 · DOCUMENT INTELLIGENCE DESK</span>
            </div>
            <h1 className="font-['Georgia',serif] text-3xl sm:text-4xl font-normal tracking-tight text-[#171714]">
              Your Legal Agreements
            </h1>
            <p className="mt-1.5 text-[14px] text-[#646158]">
              Upload, audit missing protections, inspect verified citations, and propose redlines.
            </p>
          </div>

          {totalDocs > 0 && (
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-2 rounded-[6px] border border-[#D8D2C6] bg-[#FFFDF7] px-3.5 py-2 shadow-2xs">
                <FileText className="h-4 w-4 text-[#646158]" />
                <span className="text-[#646158]">Total:</span>
                <strong className="text-[#171714] font-bold text-sm tabular-nums">{totalDocs}</strong>
              </div>
              {readyDocs > 0 && (
                <div className="flex items-center gap-2 rounded-[6px] border border-[#2E7D4F]/30 bg-[#2E7D4F]/10 px-3.5 py-2 text-[#2E7D4F]">
                  <CheckCircle2 className="h-4 w-4 text-[#2E7D4F]" />
                  <span>Ready & Verified:</span>
                  <strong className="font-bold text-sm tabular-nums">{readyDocs}</strong>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Upload Zone */}
        <section aria-label="Upload document" className="w-full">
          <UploadDropzone />
        </section>

        {/* Documents Section */}
        <section aria-label="Uploaded documents list" className="flex flex-col gap-3.5">
          <div className="flex items-center justify-between border-b border-[#D8D2C6] pb-2.5">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-4 w-4 text-[#F04D35]" />
              <h2 className="font-mono text-[11px] font-bold text-[#171714] uppercase tracking-wider">
                Document Repository
              </h2>
            </div>

            {totalDocs > 0 && (
              <span className="font-mono text-[11px] font-bold text-[#646158] bg-[#FFFDF7] px-2 py-0.5 rounded-[4px] border border-[#D8D2C6] tabular-nums">
                {totalDocs} {totalDocs === 1 ? "agreement" : "agreements"}
              </span>
            )}
          </div>

          <DocumentList items={list.items} nextCursor={list.nextCursor} />
        </section>
      </div>

      {/* Editorial Footer Strip */}
      <footer className="w-full border-t border-[#D8D2C6] bg-[#FFFDF7] py-6 text-[11px] font-mono text-[#989388]">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-6 sm:px-10 lg:px-14 xl:px-16">
          <span>© {new Date().getFullYear()} Clause. Informational document analysis only.</span>
          <nav className="flex items-center gap-4" aria-label="Footer navigation">
            <Link href="/privacy" className="transition-colors hover:text-[#171714]">Privacy</Link>
            <Link href="/terms" className="transition-colors hover:text-[#171714]">Terms</Link>
          </nav>
        </div>
      </footer>
    </main>
  );
}
