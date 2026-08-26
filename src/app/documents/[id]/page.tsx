import { notFound } from "next/navigation";
import Link from "next/link";
import { getSessionUser } from "@/lib/session";
import {
  getDocumentForUser,
  getAnalysisForUser,
  getPageForUser,
} from "@/lib/documents/repository";
import { WorkspaceAnalysisSchema } from "@/lib/schemas/workspace";
import { errorMessage } from "@/lib/error-codes";
import { AnalysisTabs } from "@/components/workspace/analysis-tabs";
import { PdfPane } from "@/components/workspace/pdf-pane";
import {
  VerificationBadge,
  PageBadgeLink,
} from "@/components/workspace/evidence";
import {
  DocumentActions,
  StatusPoller,
} from "@/components/workspace/document-actions";
import { ChatDrawer } from "@/components/workspace/chat-drawer";

export const dynamic = "force-dynamic";

const DISCLAIMER =
  "AI-generated document analysis is informational only. It is not legal advice and does not determine whether a document or clause is legal, valid, or enforceable.";

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ page?: string }>;
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex gap-3 border-b border-hairline-soft py-2 last:border-0">
      <dt className="w-40 shrink-0 text-xs font-semibold uppercase tracking-wide text-stone">
        {label}
      </dt>
      <dd className="text-sm leading-relaxed">{value}</dd>
    </div>
  );
}

function EvidenceQuote({
  documentId,
  source,
}: {
  documentId: string;
  source: {
    quote: string;
    page: number;
    verification: "verified" | "verified_fuzzy" | "page_corrected" | "unverified";
    correctedPage?: number;
  };
}) {
  const displayPage = source.correctedPage ?? source.page;
  return (
    <div className="mt-3 rounded-md border border-hairline-soft bg-surface p-3">
      <blockquote className="mb-2 border-l-2 border-primary pl-3 text-sm italic leading-relaxed text-ink-tint">
        “{source.quote}”
      </blockquote>
      <div className="flex flex-wrap items-center gap-2">
        <PageBadgeLink documentId={documentId} page={displayPage} />
        <VerificationBadge source={source} />
      </div>
    </div>
  );
}

function EmptySection({ text }: { text: string }) {
  return (
    <p className="rounded-lg border border-hairline-soft bg-surface p-6 text-center text-sm text-steel">
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

  let pageText: string | null = null;
  if (
    Number.isInteger(requestedPage) &&
    requestedPage >= 1 &&
    doc.status === "ready"
  ) {
    const pageRow = await getPageForUser(id, user.id, requestedPage);
    pageText = pageRow?.text ?? null;
  }

  const sections = parsedAnalysis?.success
    ? {
        overview: (
          <dl className="rounded-lg border border-hairline-soft bg-canvas p-6">
            {parsedAnalysis.data.overview.document_type && (
              <Field label="Type" value={parsedAnalysis.data.overview.document_type} />
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
        ),
        highlights: (
          <div className="space-y-4">
            {parsedAnalysis.data.highlights.length === 0 ? (
              <EmptySection text="No notable provisions flagged as important." />
            ) : (
              parsedAnalysis.data.highlights.map((h, i) => (
                <article key={i} className="rounded-lg border border-hairline-soft bg-canvas p-5">
                  <h3 className="mb-1 text-base font-semibold">{h.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-tint">{h.explanation}</p>
                  <EvidenceQuote documentId={id} source={h.source} />
                </article>
              ))
            )}
          </div>
        ),
        concerns: (
          <div className="space-y-4">
            {parsedAnalysis.data.concerns.length === 0 ? (
              <EmptySection text="No potential concerns were identified." />
            ) : (
              parsedAnalysis.data.concerns.map((c, i) => (
                <article key={i} className="rounded-lg border border-beige-deep bg-canvas p-5">
                  <header className="mb-3 flex items-center gap-2">
                    <span className="rounded-full bg-cream-deeper px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide">
                      {c.priority} attention
                    </span>
                    <h3 className="text-base font-semibold">{c.title}</h3>
                  </header>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-md bg-cream p-3">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone">What it says</p>
                      <p className="text-sm leading-relaxed">{c.document_fact}</p>
                    </div>
                    <div className="rounded-md border border-hairline-soft p-3">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone">What it may mean</p>
                      <p className="text-sm leading-relaxed">{c.interpretation}</p>
                    </div>
                    <div className="rounded-md border border-hairline-soft p-3">
                      <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-stone">What is unknown</p>
                      <p className="text-sm leading-relaxed">{c.uncertainty}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm leading-relaxed text-ink-tint">
                    <strong>In plain English:</strong> {c.plain_english}
                  </p>
                  <EvidenceQuote documentId={id} source={c.source} />
                </article>
              ))
            )}
          </div>
        ),
        positives: (
          <div className="space-y-4">
            {parsedAnalysis.data.positive_points.length === 0 ? (
              <EmptySection text="No notable positive provisions identified." />
            ) : (
              parsedAnalysis.data.positive_points.map((p, i) => (
                <article key={i} className="rounded-lg border border-hairline-soft bg-canvas p-5">
                  <h3 className="mb-1 text-base font-semibold">{p.title}</h3>
                  <p className="text-sm leading-relaxed text-ink-tint">{p.explanation}</p>
                  <EvidenceQuote documentId={id} source={p.source} />
                </article>
              ))
            )}
          </div>
        ),
        questions: (
          <ol className="space-y-3">
            {parsedAnalysis.data.questions_to_ask.length === 0 ? (
              <EmptySection text="No suggested questions for this document." />
            ) : (
              parsedAnalysis.data.questions_to_ask.map((q, i) => (
                <li key={i} className="rounded-lg border border-hairline-soft bg-canvas p-4">
                  <p className="font-medium">{q.question}</p>
                  <p className="mt-1 text-sm leading-relaxed text-steel">{q.rationale}</p>
                </li>
              ))
            )}
          </ol>
        ),
      }
    : null;

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-hairline-soft">
        <div className="mx-auto max-w-7xl px-6 py-4">
          <Link href="/dashboard" className="text-sm no-underline text-primary">
            ← Dashboard
          </Link>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h1 className="display-font text-2xl tracking-tight">
              {doc.originalFilename}
            </h1>
            <div className="flex items-center gap-3">
              <StatusPoller status={doc.status} />
              <DocumentActions documentId={doc.id} status={doc.status} />
            </div>
          </div>
        </div>
      </header>

      <div className="border-b border-cream-deeper bg-cream px-6 py-2">
        <p className="mx-auto max-w-6xl text-xs leading-relaxed text-ink-tint">
          {DISCLAIMER}
        </p>
      </div>

      {doc.isScanned && doc.status === "ready" && (
        <div className="border-b border-cream-deeper bg-cream-light px-6 py-2">
          <p className="mx-auto max-w-6xl text-xs font-medium text-ink-tint">
            Text layer limited — references are AI-identified, not independently
            verified.
          </p>
        </div>
      )}

      <section id="page-panel" className="mx-auto w-full max-w-7xl flex-1 px-6 py-8">
        {!sections && doc.status !== "ready" && doc.status !== "failed" && (
          <div className="rounded-lg border border-hairline-soft bg-surface p-10 text-center">
            <StatusPoller status={doc.status} />
            <p className="mt-3 text-sm text-steel">
              This page updates automatically while the document is processed.
            </p>
          </div>
        )}

        {doc.status === "failed" && (
          <div className="rounded-lg border border-cream-deeper bg-cream p-8 text-center">
            <h2 className="display-font mb-2 text-xl">Processing failed</h2>
            <p className="mb-1 text-sm text-steel">
              {errorMessage(doc.errorCode ?? "") ??
                "An error occurred while processing this document."}
            </p>
          </div>
        )}

        {doc.status === "ready" && (
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div className="lg:sticky lg:top-6 lg:self-start">
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

            <div>
              {pageText !== null && (
                <div id="page-text" className="mb-8 rounded-lg border border-beige-deep bg-cream p-5">
                  <h2 className="display-font mb-2 text-lg">Page {requestedPage} text</h2>
                  <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-mono text-xs leading-relaxed text-ink-tint">
                    {pageText}
                  </pre>
                </div>
              )}
              {sections && (
                parsedAnalysis!.success ? (
                  <>
                    <AnalysisTabs sections={sections} />
                    <div className="mt-6">
                      <ChatDrawer
                        documentId={doc.id}
                        suggestedQuestions={parsedAnalysis!.data.questions_to_ask.map(
                          (q) => q.question
                        )}
                        disabledReason={null}
                      />
                    </div>
                  </>
                ) : (
                  <EmptySection text="Stored analysis could not be interpreted. Try re-running the analysis." />
                )
              )}
            </div>
          </div>
        )}
      </section>

      <div className="sunset-stripe h-8 w-full" aria-hidden="true" />
    </main>
  );
}
