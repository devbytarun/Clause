"use client";

import { useState } from "react";
import Link from "next/link";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

interface LoginPanelProps {
  googleEnabled: boolean;
  emailEnabled: boolean;
}

export function LoginPanel({ googleEnabled, emailEnabled }: LoginPanelProps) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle"
  );
  const [message, setMessage] = useState<string | null>(null);

  async function handleGoogle() {
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sign-in failed");
    }
  }

  async function handleEmailSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setStatus("sending");
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
          shouldCreateUser: true,
        },
      });
      if (error) throw error;
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Could not send link");
    }
  }

  const configured = googleEnabled || emailEnabled;

  return (
    <div className="w-full max-w-md rounded-[10px] border border-[#D8D2C6] bg-[#FFFDF7] p-8 shadow-sm">
      <h1 className="font-['Georgia',serif] mb-1.5 text-2xl font-bold text-[#171714]">
        Sign in to Clause
      </h1>
      <p className="mb-6 text-[13px] leading-relaxed text-[#646158]">
        Inspect contract citations, detect blindspots, and propose redlines.
      </p>

      <div className="mb-6">
        <Link
          href="/dashboard"
          className="flex h-11 w-full items-center justify-center rounded-[6px] bg-[#F04D35] text-[13px] font-bold text-[#FFFDF7] no-underline transition-all hover:bg-[#C93625] active:scale-[0.96] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]"
        >
          Open Workspace Directly →
        </Link>
      </div>

      <div className="my-5 flex items-center gap-3">
        <span className="h-px flex-1 bg-[#D8D2C6]" />
        <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#989388]">
          or sign in with email
        </span>
        <span className="h-px flex-1 bg-[#D8D2C6]" />
      </div>

      {!configured && (
        <p className="text-[12px] leading-relaxed text-[#646158]">
          Auth providers are running in mock mode for local preview. You can access all workspace features using the button above.
        </p>
      )}

      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={handleGoogle}
            className="flex h-11 w-full items-center justify-center rounded-[6px] border border-[#D8D2C6] bg-[#FFFDF7] text-[13px] font-bold text-[#171714] transition-colors hover:bg-[#F3F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]"
          >
            Continue with Google
          </button>
          {emailEnabled && (
            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-[#D8D2C6]" />
              <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-[#989388]">
                or
              </span>
              <span className="h-px flex-1 bg-[#D8D2C6]" />
            </div>
          )}
        </>
      )}

      {emailEnabled && (
        <form onSubmit={handleEmailSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block font-mono text-[11px] font-bold uppercase tracking-wider text-[#171714] mb-1.5">
              Work email address
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              required
              className="h-10 w-full rounded-[6px] border border-[#D8D2C6] bg-[#FFFDF7] px-3 text-[13px] text-[#171714] placeholder-[#989388] transition-all focus:outline-none focus:ring-2 focus:ring-[#3157D5] focus:border-[#3157D5]"
            />
          </div>

          <button
            type="submit"
            disabled={status === "sending"}
            className="flex h-10 w-full items-center justify-center rounded-[6px] border border-[#171714] bg-[#171714] text-[13px] font-bold text-[#FFFDF7] transition-all hover:bg-black active:scale-[0.96] disabled:opacity-50"
          >
            {status === "sending" ? "Sending magic link…" : "Send sign-in link"}
          </button>
        </form>
      )}

      {status === "sent" && (
        <div className="mt-4 rounded-[6px] border border-[#2E7D4F]/30 bg-[#2E7D4F]/10 p-3 text-[12px] font-mono text-[#2E7D4F]">
          Magic link sent. Check your inbox to finish signing in.
        </div>
      )}

      {message && (
        <div className="mt-4 rounded-[6px] border border-[#C53B36]/30 bg-[#C53B36]/10 p-3 text-[12px] font-mono text-[#C53B36]">
          {message}
        </div>
      )}
    </div>
  );
}
