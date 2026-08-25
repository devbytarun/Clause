"use client";

import { signOut } from "next-auth/react";

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="rounded-md border border-hairline-strong px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface"
    >
      Sign out
    </button>
  );
}
