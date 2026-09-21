import type { Metadata } from "next";
import Link from "next/link";
import { LoginPanel } from "@/components/auth/login-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in — Clause" };

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>;
}

function supabaseAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { error } = await searchParams;
  const googleEnabled =
    supabaseAuthConfigured() &&
    process.env.NEXT_PUBLIC_ENABLE_GOOGLE_SIGNIN === "1";
  const emailEnabled = supabaseAuthConfigured();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-[#F3F0E8] px-6 py-16 text-[#171714]">
      <Link href="/" className="font-['Georgia',serif] mb-8 text-3xl font-bold tracking-tight text-[#171714] no-underline">
        Clause<span className="text-[#F04D35]">.</span>
      </Link>
      {error && (
        <p role="alert" className="mb-4 rounded-[6px] border border-[#C53B36]/30 bg-[#FFFDF7] px-4 py-2 text-xs font-mono text-[#C53B36]">
          Sign-in could not be completed. Please try again.
        </p>
      )}
      <LoginPanel googleEnabled={googleEnabled} emailEnabled={emailEnabled} />

      <footer className="mt-8 text-center font-mono text-[11px] text-[#989388]">
        © {new Date().getFullYear()} Clause · Machine-Validated Contract Intelligence
      </footer>
    </main>
  );
}
