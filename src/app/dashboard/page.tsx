import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { getSessionUser } from "@/lib/session";

export const metadata: Metadata = { title: "Dashboard — Clause" };
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-hairline-soft">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link
            href="/"
            className="display-font text-xl tracking-tight no-underline"
          >
            Clause<span className="text-primary">_</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-steel">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
        <h1 className="display-font mb-2 text-4xl tracking-tight">
          Your documents
        </h1>
        <p className="mb-10 text-base leading-relaxed text-steel">
          Upload a PDF to begin. Analysis is informational only — not legal
          advice.
        </p>
        <div className="rounded-lg border border-hairline-soft bg-surface p-10 text-center">
          <p className="text-sm text-steel">
            Upload arrives in Phase 3. Auth is wired and working.
          </p>
        </div>
      </section>

      <div className="sunset-stripe h-8 w-full" aria-hidden="true" />
    </main>
  );
}
