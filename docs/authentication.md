# Authentication

**Decision: Supabase Auth (ADR D-001).** Identity, magic-link emails,
Google OAuth, and session tokens are owned by Supabase (free tier).
The application database keeps a mirrored `users` profile row whose
primary key equals `auth.users.id`.

## Flows

| Flow | Path |
|---|---|
| Email magic link | `/login` → `signInWithOtp({email, emailRedirectTo:/api/auth/callback})` → Supabase email → callback exchanges code for session cookies |
| Google OAuth | `/login` → `signInWithOAuth({provider:'google', redirectTo:/api/auth/callback})` → consent → callback |
| Sign out | client POSTs `/api/auth/signout` → server `auth.signOut()` clears cookies |
| Session read | every request via `getSessionUser()`: Supabase `getUser()` (JWT-verified server-side) then upsert of the mirrored `users` row |

## Enforcement points

- `withAuth(routeHandler)` — the single gate for all API routes:
  1. same-origin Origin check on mutating methods,
  2. `getSessionUser()`; missing session → uniform `401 unauthorized`.
- Server components (`/dashboard`, `/documents/[id]`) call
  `getSessionUser()` and redirect / 404 when absent.
- Client-sent identity is never trusted anywhere; `userId` always comes
  from the verified session.

## Alternatives considered

| Alternative | Why rejected | Trade-off accepted with Supabase | Reconsider when |
|---|---|---|---|
| Auth.js v5 + Drizzle adapter (original blueprint) | operator had to configure Google Cloud OAuth + SMTP before login worked at all | sessions live in Supabase, not app DB (instant revocation requires Supabase dashboard/admin API) | need database-session revocation semantics in-app |
| Password auth in Supabase | blueprint prefers passwordless; password storage/reset surface avoided | users must receive emails to sign in | user research shows magic links block adoption |
| Custom JWT auth | hand-rolled crypto liability | n/a | never |

## Configuration surface

Provider visibility in UI is env-driven so the sign-in page renders an
honest "not configured" state instead of broken buttons:

- `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (public by design)
- `NEXT_PUBLIC_ENABLE_GOOGLE_SIGNIN=1` after enabling Google in the
  Supabase dashboard (redirect URL: `{APP_URL}/api/auth/callback`)
