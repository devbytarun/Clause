import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-hairline-soft">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <span className="display-font text-xl tracking-tight">
            Clause<span className="text-primary">_</span>
          </span>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/privacy" className="no-underline text-steel hover:text-ink">
              Privacy
            </Link>
            <Link href="/login" className="no-underline text-steel hover:text-ink">
              Sign in
            </Link>
            <Link
              href="/signup"
              className="rounded-md bg-primary px-4 py-2 font-medium no-underline text-white transition-colors hover:bg-primary-deep"
            >
              Get started
            </Link>
          </nav>
        </div>
      </header>
      <section className="flex flex-1 items-center justify-center px-8 py-32">
        <div className="max-w-3xl text-center">
          <h1 className="display-font mb-6 text-6xl leading-[1.05] tracking-tight">
            Read every document carefully.
          </h1>
          <p className="text-lg leading-relaxed text-steel">
            Clause analyzes offers, NDAs, and agreements against the text that
            is actually in them. Every AI statement is checked against the
            document before you see it.
          </p>
          <p className="mt-4 text-sm leading-relaxed text-stone">
            Informational analysis only — not legal advice.
          </p>
        </div>
      </section>
      <footer className="px-6 pb-6">
        <nav className="mx-auto flex max-w-6xl gap-4 text-sm">
          <Link href="/privacy" className="no-underline text-primary">Privacy</Link>
          <Link href="/terms" className="no-underline text-primary">Terms</Link>
        </nav>
      </footer>
      <div className="sunset-stripe h-10 w-full" aria-hidden="true" />
    </main>
  );
}
