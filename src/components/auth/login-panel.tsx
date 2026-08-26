"use client";

import { useState } from "react";
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
    <div className="w-full max-w-md rounded-lg border border-beige-deep bg-cream p-8">
      <h1 className="display-font mb-1 text-3xl">Sign in</h1>
      <p className="mb-6 text-sm leading-relaxed text-steel">
        Analyze offers, NDAs, and agreements against their own text.
      </p>

      {!configured && (
        <p className="text-sm leading-relaxed text-ink-tint">
          No sign-in method is configured on this deployment yet. Ask the
          operator to enable Google sign-in or magic-link emails in the
          Supabase project settings.
        </p>
      )}

      {googleEnabled && (
        <>
          <button
            type="button"
            onClick={handleGoogle}
            className="flex h-11 w-full items-center justify-center rounded-md border border-hairline-strong bg-canvas text-sm font-medium text-ink transition-colors hover:bg-surface"
          >
            Continue with Google
          </button>
          {emailEnabled && (
            <div className="my-5 flex items-center gap-3">
              <span className="h-px flex-1 bg-hairline" />
              <span className="text-xs uppercase tracking-wide text-stone">
                or
              </span>
              <span className="h-px flex-1 bg-hairline" />
            </div>
          )}
        </>
      )}

      {emailEnabled && (
        <form onSubmit={handleEmailSubmit} className="space-y-3">
          <label
            htmlFor="email"
            className="block text-xs font-semibold uppercase tracking-wide text-steel"
          >
            Email address
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="h-11 w-full rounded-md border border-hairline-strong bg-canvas px-4 text-base outline-none placeholder:text-muted focus:border-2 focus:border-primary focus:px-[15px]"
          />
          <button
            type="submit"
            disabled={status === "sending"}
            className="h-11 w-full rounded-md bg-primary text-sm font-medium text-white transition-colors hover:bg-primary-deep disabled:bg-hairline disabled:text-muted"
          >
            {status === "sending" ? "Sending link…" : "Email me a sign-in link"}
          </button>
        </form>
      )}

      {status === "sent" && (
        <p role="status" className="mt-4 text-sm leading-relaxed text-ink-tint">
          Check your inbox — the sign-in link is valid for a short time.
        </p>
      )}
      {message && (
        <p role="alert" className="mt-4 text-sm leading-relaxed text-primary-deep">
          {message}
        </p>
      )}

      <p className="mt-8 border-t border-beige-deep pt-4 text-xs leading-relaxed text-steel">
        By signing in you acknowledge that uploaded documents are processed
        through cloud infrastructure and an external AI service. On the AI
        provider&apos;s free tier, that content may be used to improve their
        services.
      </p>
    </div>
  );
}
