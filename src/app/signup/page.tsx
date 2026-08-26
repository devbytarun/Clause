import type { Metadata } from "next";
import Link from "next/link";
import { LoginPanel } from "@/components/auth/login-panel";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Create account — Clause" };

function supabaseAuthConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()
  );
}

export default function SignupPage() {
  const googleEnabled =
    supabaseAuthConfigured() &&
    process.env.NEXT_PUBLIC_ENABLE_GOOGLE_SIGNIN === "1";
  const emailEnabled = supabaseAuthConfigured();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="display-font mb-10 text-2xl tracking-tight no-underline">
        Clause<span className="text-primary">_</span>
      </Link>
      <LoginPanel googleEnabled={googleEnabled} emailEnabled={emailEnabled} />
      <div className="sunset-stripe fixed bottom-0 left-0 h-8 w-full" aria-hidden="true" />
    </main>
  );
}
