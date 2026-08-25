import type { Metadata } from "next";
import Link from "next/link";
import { LoginPanel } from "@/components/auth/login-panel";
import { enabledProviderIds } from "@/lib/auth";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Sign in — Clause" };

export default function LoginPage() {
  const ids = enabledProviderIds();
  return (
    <main className="flex min-h-screen flex-col items-center justify-center px-6 py-16">
      <Link href="/" className="display-font mb-10 text-2xl tracking-tight no-underline">
        Clause<span className="text-primary">_</span>
      </Link>
      <LoginPanel googleEnabled={ids.includes("google")} emailEnabled={ids.includes("nodemailer")} />
      <div className="sunset-stripe fixed bottom-0 left-0 h-8 w-full" aria-hidden="true" />
    </main>
  );
}
