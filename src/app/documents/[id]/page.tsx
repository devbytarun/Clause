import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import {
  getDocumentForUser,
  getAnalysisForUser,
} from "@/lib/documents/repository";
import { WorkspaceAnalysisSchema } from "@/lib/schemas/workspace";
import { errorMessage } from "@/lib/error-codes";
import { AnalysisTabs } from "@/components/workspace/analysis-tabs";
import { PdfPane } from "@/components/workspace/pdf-pane";
import { ConcernItem } from "@/components/workspace/concern-item";
import { EvidenceQuote } from "@/components/workspace/evidence-quote";
import {
  DocumentActions,
  StatusPoller,
} from "@/components/workspace/document-actions";
import { ChatDrawer } from "@/components/workspace/chat-drawer";
import { MobileChatFab } from "@/components/workspace/mobile-chat-fab";
import { FileText, ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1 border-b border-[#D8D2C6]/60 py-2.5 last:border-0 sm:flex-row sm:gap-3">
      <dt className="shrink-0 font-mono text-[11px] font-bold uppercase tracking-wider text-[#646158] sm:w-40">
        {label}
      </dt>
      <dd className="min-w-0 break-words text-[13px] leading-relaxed text-[#171714] font-medium">{value}</dd>
    </div>
  );
}

function EmptySection({ text }: { text: string }) {
  return (
    <p className="rounded-[8px] border border-[#D8D2C6] bg-[#FFFDF7] p-8 text-center text-[13px] text-[#646158]">
      {text}
    </p>
  );
}

export default async function WorkspacePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const user = await getSessionUser();
  if (!user) notFound();

  const doc = await getDocumentForUser(id, user.id);
  if (!doc) notFound();

  const sp = await searchParams;
  const requestedPage = Number(sp.page);

  const analysisRaw =
    doc.status === "ready" ? await getAnalysisForUser(id, user.id) : null;
  const parsedAnalysis = analysisRaw
    ? WorkspaceAnalysisSchema.safeParse(analysisRaw.result)
    : null;

  const counts = parsedAnalysis?.success
    ? {
        highlights: parsedAnalysis.data.highlights.length,
        concerns: parsedAnalysis.data.concerns.length,
        positives: parsedAnalysis.data.positive_points.length,
      }
    : undefined;

  const sections = parsedAnalysis?.success
    ? {
        overview: (
          <div className="space-y-4">
            <dl className="divide-y divide-[#D8D2C6]/60 rounded-[8px] border border-[#D8D2C6] bg-[#FFFDF7] p-4">
              {parsedAnalysis.data.overview.document_type && (
                <Field label="Document Type" value={parsedAnalysis.data.overview.document_type} />
              )}
              {parsedAnalysis.data.overview.parties.map((p, i) => (
                <Field key={i} label={`Party ${i + 1}`} value={`${p.name} (${p.role})`} />
              ))}
              {parsedAnalysis.data.overview.dates.map((d, i) => (
                <Field key={i} label={d.label} value={d.value} />
              ))}
              {parsedAnalysis.data.overview.compensation && (
                <Field label="Compensation" value={parsedAnalysis.data.overview.compensation} />
              )}
              {parsedAnalysis.data.overview.duration && (
                <Field label="Duration" value={parsedAnalysis.data.overview.duration} />
              )}
              {parsedAnalysis.data.overview.notice_period && (
                <Field label="Notice period" value={parsedAnalysis.data.overview.notice_period} />
              )}
              {parsedAnalysis.data.overview.probation && (
                <Field label="Probation" value={parsedAnalysis.data.overview.probation} />
              )}
              {parsedAnalysis.data.overview.location && (
                <Field label="Location" value={parsedAnalysis.data.overview.location} />
              )}
              {parsedAnalysis.data.overview.hours && (
                <Field label="Hours" value={parsedAnalysis.data.overview.hours} />
              )}
              {parsedAnalysis.data.overview.benefits.length > 0 && (
                <Field
                  label="Benefits"
                  value={parsedAnalysis.data.overview.benefits.join("; ")}
                />
              )}
              {parsedAnalysis.data.overview.deadlines.map((d, i) => (
                <Field key={i} label={d.label} value={d.value} />
              ))}
            </dl>
          </div>
        ),
        concerns: (
          <div className="space-y-3.5">
            {parsedAnalysis.data.concerns.length === 0 ? (
              <EmptySection text="No potential concerns were identified." />
            ) : (
              parsedAnalysis.data.concerns.map((c, i) => (
                <ConcernItem key={i} documentId={id} concern={c} />
              ))
            )}
          </div>
        ),
        highlights: (
          <div className="space-y-3">
            {parsedAnalysis.data.highlights.length === 0 ? (
              <EmptySection text="No notable provisions flagged as important." />
            ) : (
              parsedAnalysis.data.highlights.map((h, i) => (
                <article key={i} className="rounded-[8px] border border-[#D8D2C6] bg-[#FFFDF7] p-4 transition-all">
                  <h3 className="mb-1 font-['Georgia',serif] text-sm font-semibold text-[#171714]">{h.title}</h3>
                  <p className="text-[12px] leading-relaxed text-[#646158]">{h.explanation}</p>
                  <EvidenceQuote documentId={id} source={h.source} />
                </article>
              ))
            )}
          </div>
        ),
        positives: (
          <div className="space-y-3">
            {parsedAnalysis.data.positive_points.length === 0 ? (
              <EmptySection text="No notable positive provisions identified." />
            ) : (
              parsedAnalysis.data.positive_points.map((p, i) => (
                <article key={i} className="rounded-[8px] border border-[#D8D2C6] bg-[#FFFDF7] p-4 transition-all">
                  <h3 className="mb-1 font-['Georgia',serif] text-sm font-semibold text-[#171714]">{p.title}</h3>
                  <p className="text-[12px] leading-relaxed text-[#646158]">{p.explanation}</p>
                  <EvidenceQuote documentId={id} source={p.source} />
                </article>
              ))
            )}
          </div>
        ),
        chat: (
          <ChatDrawer
            documentId={id}
            suggestedQuestions={parsedAnalysis.data.questions_to_ask.map(
              (q) => q.question
            )}
            disabledReason={null}
          />
        ),
      }
    : null;

  return (
    <main className="flex min-h-screen flex-col bg-[#F3F0E8] text-[#171714] font-sans antialiased">
      {/* Top Header — Stretched edge-to-edge */}
      <header className="sticky top-0 z-20 border-b border-[#D8D2C6] bg-[#FFFDF7] shadow-2xs">
        <div className="flex min-h-14 w-full flex-wrap items-center justify-between gap-x-3 gap-y-2 px-3 py-2 sm:h-14 sm:flex-nowrap sm:px-8 sm:py-0">
          <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3.5">
            <Link
              href="/dashboard"
              aria-label="Back to dashboard"
              className="inline-flex shrink-0 items-center gap-1.5 font-mono text-[12px] font-bold text-[#646158] hover:text-[#171714] no-underline transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
            <span className="hidden h-4 w-px bg-[#D8D2C6] sm:block" />
            <div className="flex min-w-0 items-center gap-2">
              <FileText className="h-4 w-4 text-[#F04D35] shrink-0" />
              <h1 className="max-w-[38vw] truncate font-sans text-sm font-semibold tracking-tight text-[#171714] sm:max-w-md lg:max-w-lg" title={doc.originalFilename}>
                {doc.originalFilename}
              </h1>
              {doc.pageCount && (
                <span className="hidden sm:inline-block rounded-[4px] bg-[#F3F0E8] border border-[#D8D2C6] px-2 py-0.5 font-sans text-[11px] font-semibold tabular-nums text-[#646158]">
                  {doc.pageCount} {doc.pageCount === 1 ? "page" : "pages"}
                </span>
              )}
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            <span className="max-[420px]:hidden"><StatusPoller status={doc.status} /></span>
            <DocumentActions documentId={doc.id} status={doc.status} />
          </div>
        </div>
      </header>

      {/* Main Workspace Area — Stretched across viewport */}
      <div id="page-panel" className="flex w-full flex-1 flex-col px-3 py-3 sm:px-6 sm:py-4 lg:px-8">
        {!sections && doc.status !== "ready" && doc.status !== "failed" && (
          <div className="rounded-[10px] border border-[#D8D2C6] bg-[#FFFDF7] p-10 text-center shadow-xs">
            <StatusPoller status={doc.status} />
            <p className="mt-3 text-sm text-[#646158]">
              This document is being processed. Analysis will appear automatically once complete.
            </p>
          </div>
        )}

        {doc.status === "failed" && (
          <div className="rounded-[10px] border border-[#C53B36]/30 bg-[#FFFDF7] p-8 text-center shadow-xs">
            <h2 className="font-['Georgia',serif] mb-2 text-xl font-bold text-[#C53B36]">Processing failed</h2>
            <p className="mb-4 text-sm text-[#646158]">
              {errorMessage(doc.errorCode ?? "") ??
                "An error occurred while processing this document."}
            </p>
            <DocumentActions documentId={doc.id} status={doc.status} />
          </div>
        )}

        {doc.status === "ready" && (
          <div className="grid min-h-0 flex-1 grid-cols-1 items-stretch gap-4 sm:gap-5 lg:grid-cols-12">
            {/* Left Column: PDF Viewer */}
            <div className="flex h-[min(55dvh,560px)] min-h-[320px] max-h-[560px] min-w-0 flex-col sm:h-[55vh] lg:col-span-6 lg:h-[calc(100vh-100px)] lg:min-h-[580px]">
              <PdfPane
                documentId={doc.id}
                initialPage={
                  Number.isInteger(requestedPage) && requestedPage >= 1
                    ? requestedPage
                    : 1
                }
                pageCount={doc.pageCount}
              />
            </div>

            {/* Right Column: Analysis Tabs & Chat */}
            <div className="flex h-[min(680px,calc(100dvh-5.5rem))] min-h-[520px] min-w-0 flex-col lg:col-span-6 lg:h-[calc(100vh-100px)] lg:min-h-[580px]">
              {sections ? (
                <AnalysisTabs sections={sections} counts={counts} defaultTab="concerns" />
              ) : (
                <div className="flex h-full items-center justify-center rounded-[10px] border border-[#D8D2C6] bg-[#FFFDF7] p-8 text-center text-sm text-[#646158]">
                  Stored analysis could not be loaded. Try re-running the analysis.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Mobile Floating Q&A Button */}
      {parsedAnalysis?.success && (
        <MobileChatFab
          documentId={id}
          suggestedQuestions={parsedAnalysis.data.questions_to_ask.map(
            (q) => q.question
          )}
          disabledReason={null}
        />
      )}
    </main>
  );
}
