export default function Home() {
  return (
    <main className="flex min-h-screen flex-col">
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
        </div>
      </section>
      <div className="sunset-stripe h-10 w-full" aria-hidden="true" />
    </main>
  );
}
