"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Handles Supabase implicit-flow returns (admin magic links and some
 * email templates land on `/#access_token=...`). Exchanges the tokens
 * for session cookies via the browser client, cleans the URL, and
 * continues to the dashboard. PKCE `?code=` returns are handled
 * server-side by /api/auth/callback.
 */
export function AuthHashHandler() {
  const router = useRouter();

  useEffect(() => {
    const hash = window.location.hash;
    if (!hash.includes("access_token")) return;

    const params = new URLSearchParams(hash.slice(1));
    const accessToken = params.get("access_token");
    const refreshToken = params.get("refresh_token");
    if (!accessToken || !refreshToken) return;

    let cancelled = false;

    import("@/lib/supabase/browser")
      .then(({ getSupabaseBrowserClient }) => getSupabaseBrowserClient())
      .then((supabase) =>
        supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
      )
      .then(({ error }) => {
        if (cancelled) return;
        window.history.replaceState(null, "", window.location.pathname);
        if (!error) router.push("/dashboard");
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [router]);

  return null;
}
