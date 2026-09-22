import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Workspace — Clause" };

export default function SignupPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="display-font mb-10 text-2xl tracking-tight no-underline">
        Clause<span className="text-primary">_</span>
      </Link>
      <p className="mb-5 max-w-sm text-center text-sm text-[#646158]">
        Accounts are not required. Your local workspace stores uploaded PDFs on this machine.
      </p>
      <Link href="/dashboard" className="rounded-[6px] bg-[#F04D35] px-6 py-3 text-sm font-bold text-[#FFFDF7] no-underline">
        Open workspace
      </Link>
      <div className="sunset-stripe fixed bottom-0 left-0 h-8 w-full" aria-hidden="true" />
    </main>
  );
}
