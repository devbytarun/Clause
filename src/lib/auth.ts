import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Nodemailer from "next-auth/providers/nodemailer";
import { DrizzleAdapter } from "@auth/drizzle-adapter";
import { db } from "@/db";
import { getEnv } from "@/lib/env";

/**
 * Auth.js v5 with database sessions.
 *
 * The NextAuth instance (and therefore the Drizzle adapter, which
 * type-checks its database handle at construction) is built lazily on
 * first use so importing this module never touches the environment or
 * storage driver during `next build` page-data collection.
 */

function buildProviderList() {
  const env = getEnv();
  const providers = [];
  const ids: string[] = [];

  if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
    providers.push(
      Google({
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        authorization: {
          params: { prompt: "select_account" },
        },
      })
    );
    ids.push("google");
  }

  if (env.EMAIL_SERVER_HOST && env.EMAIL_FROM) {
    providers.push(
      Nodemailer({
        server: {
          host: env.EMAIL_SERVER_HOST,
          port: env.EMAIL_SERVER_PORT ?? 587,
          auth:
            env.EMAIL_SERVER_USER && env.EMAIL_SERVER_PASSWORD
              ? { user: env.EMAIL_SERVER_USER, pass: env.EMAIL_SERVER_PASSWORD }
              : undefined,
        },
        from: env.EMAIL_FROM,
      })
    );
    ids.push("nodemailer");
  }

  return { providers, ids };
}

/**
 * Provider availability is derived directly from process.env so the
 * sign-in page can render its honest "not configured" state even on
 * deployments missing required core variables. Full env validation
 * still gates every real auth/DB operation.
 */
export function enabledProviderIds(): string[] {
  const ids: string[] = [];
  if (
    process.env.GOOGLE_CLIENT_ID?.trim() &&
    process.env.GOOGLE_CLIENT_SECRET?.trim()
  ) {
    ids.push("google");
  }
  if (process.env.EMAIL_SERVER_HOST?.trim() && process.env.EMAIL_FROM?.trim()) {
    ids.push("nodemailer");
  }
  return ids;
}

type NextAuthInstance = ReturnType<typeof NextAuth>;

const globalForAuth = globalThis as unknown as {
  clauseAuth?: NextAuthInstance;
};

function getAuthInstance(): NextAuthInstance {
  if (!globalForAuth.clauseAuth) {
    globalForAuth.clauseAuth = NextAuth({
      adapter: DrizzleAdapter(db),
      session: { strategy: "database" },
      trustHost: true,
      providers: buildProviderList().providers,
      pages: { signIn: "/login" },
      callbacks: {
        signIn: ({ user }) => Boolean(user?.id),
      },
    });
  }
  return globalForAuth.clauseAuth;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyFn = (...args: any[]) => any;

function delegate<F extends AnyFn>(pick: (i: NextAuthInstance) => F): F {
  return ((...args: any[]) => pick(getAuthInstance())(...args)) as F;
}

export const handlers: NextAuthInstance["handlers"] = {
  GET: delegate((i) => i.handlers.GET),
  POST: delegate((i) => i.handlers.POST),
};

export const auth: NextAuthInstance["auth"] = delegate((i) => i.auth);

export const signIn: NextAuthInstance["signIn"] = delegate((i) => i.signIn);

export const signOut: NextAuthInstance["signOut"] = delegate((i) => i.signOut);
