import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Privacy — Clause" };

const SECTIONS: { heading: string; body: React.ReactNode }[] = [
  {
    heading: "What happens when you upload a document",
    body: (
      <>
        <p>
          Your document is uploaded to our server, stored in cloud storage,
          processed for text extraction, and sent to Google&apos;s Gemini API
          for analysis. Results are stored in our database. It is not a
          private local tool.
        </p>
      </>
    ),
  },
  {
    heading: "What we collect and store",
    body: (
      <ul className="list-disc space-y-1 pl-5">
        <li>The PDF file itself (private cloud-storage bucket)</li>
        <li>The filename you uploaded it with</li>
        <li>File size, type, and content hash (for duplicate detection)</li>
        <li>Extracted per-page text (used to verify every AI citation)</li>
        <li>Your analysis results and chat conversation messages</li>
        <li>Your account email from Supabase authentication</li>
      </ul>
    ),
  },
  {
    heading: "What is sent to the AI service",
    body: (
      <p>
        The full extracted text of your document (with page markers), the
        analysis request or your chat question plus recent chat history.
        Nothing else is sent, and other users&apos; documents are never
        mixed with yours.
      </p>
    ),
  },
  {
    heading: "Free-tier AI disclosure",
    body: (
      <p>
        This service currently uses Gemini&apos;s free API tier. On the free
        tier, Google may use submitted content to improve its products.
        Do not upload information you are not comfortable transmitting to
        Google under those terms. If/when this service moves to a paid
        tier, this page will state that paid-tier submissions are not used
        for product improvement.
      </p>
    ),
  },
  {
    heading: "Logs",
    body: (
      <p>
        Operational logs contain event metadata only — document IDs, sizes,
        stage durations, error codes, token counts. Logs never contain
        document text, filenames, prompts, or chat message content.
      </p>
    ),
  },
  {
    heading: "Deletion",
    body: (
      <p>
        Deleting a document hides it immediately and permanently removes the
        stored file, its extracted pages, analysis, and chat history.
        Encrypted database backups may retain deleted data for a limited
        period after deletion; the retention window for this deployment is
        set by the database provider plan (verify before relying on an exact
        figure). Storage objects are deleted immediately and are not
        versioned.
      </p>
    ),
  },
  {
    heading: "Scanned documents",
    body: (
      <p>
        For PDFs without a usable text layer, citations shown in the app are
        AI-identified references that cannot be independently verified
        against extracted text. These are labeled as such wherever they
        appear.
      </p>
    ),
  },
];

export default function PrivacyPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <section className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <h1 className="display-font mb-8 text-4xl tracking-tight">Privacy</h1>
        <div className="space-y-8">
          {SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2 className="mb-2 text-lg font-semibold">{s.heading}</h2>
              <div className="text-sm leading-relaxed text-ink-tint">{s.body}</div>
            </section>
          ))}
        </div>
        <p className="mt-12 text-xs leading-relaxed text-steel">
          Questions about this policy? Contact the operator of this deployment.
        </p>
      </section>
      <footer className="border-t border-hairline-soft px-6 py-4">
        <nav className="mx-auto flex max-w-3xl gap-4 text-sm">
          <Link href="/" className="no-underline text-primary">Home</Link>
          <Link href="/dashboard" className="no-underline text-primary">Dashboard</Link>
          <Link href="/terms" className="no-underline text-primary">Terms</Link>
        </nav>
      </footer>
      <div className="sunset-stripe h-6 w-full" aria-hidden="true" />
    </main>
  );
}
