import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = { title: "Terms — Clause" };

export default function TermsPage() {
  return (
    <main className="flex min-h-screen flex-col">
      <section className="mx-auto w-full max-w-3xl flex-1 px-6 py-16">
        <h1 className="display-font mb-8 text-4xl tracking-tight">Terms</h1>
        <div className="space-y-6 text-sm leading-relaxed text-ink-tint">
          <p>
            Clause provides automated, AI-assisted reading of documents you
            upload. The output is informational only. It is not legal advice,
            does not create an attorney-client relationship, and does not
            determine whether any document or clause is legal, valid, or
            enforceable.
          </p>
          <p>
            AI analysis can be incomplete or incorrect. Every citation is
            machine-checked against the text of your document where possible,
            but verification of a citation is not verification of the
            interpretation. Always read the underlying document yourself and
            consult a qualified professional for decisions that matter.
          </p>
          <p>
            You must have the right to upload any document you submit. Do not
            upload documents if you are not permitted to share them with the
            cloud services described on the Privacy page.
          </p>
          <p>
            The service is provided as-is, without warranties of any kind, to
            the maximum extent permitted by law.
          </p>
        </div>
      </section>
      <footer className="border-t border-hairline-soft px-6 py-4">
        <nav className="mx-auto flex max-w-3xl gap-4 text-sm">
          <Link href="/" className="no-underline text-primary">Home</Link>
          <Link href="/privacy" className="no-underline text-primary">Privacy</Link>
        </nav>
      </footer>
      <div className="sunset-stripe h-6 w-full" aria-hidden="true" />
    </main>
  );
}
