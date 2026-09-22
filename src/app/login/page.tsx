import type { Metadata } from "next";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Workspace — Clause" };

export default function LoginPage() {

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F3F0E8] px-6 py-16 text-[#171714]">
      <Link href="/" className="font-['Georgia',serif] mb-8 text-3xl font-bold tracking-tight text-[#171714] no-underline">
        Clause<span className="text-[#F04D35]">.</span>
      </Link>
      <p className="mb-5 max-w-sm text-center text-sm text-[#646158]">
        Login has been removed. Clause now opens a local workspace and saves PDFs on this machine.
      </p>
      <Link href="/dashboard" className="rounded-[6px] bg-[#F04D35] px-6 py-3 text-sm font-bold text-[#FFFDF7] no-underline">
        Open workspace
      </Link>

      <footer className="mt-8 text-center font-mono text-[11px] text-[#989388]">
        © {new Date().getFullYear()} Clause · Machine-Validated Contract Intelligence
      </footer>
    </main>
  );
}
