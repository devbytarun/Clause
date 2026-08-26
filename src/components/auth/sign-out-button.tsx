"use client";

import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await fetch("/api/auth/signout", { method: "POST" });
        router.push("/");
      }}
    >
      <button
        type="submit"
        className="rounded-md border border-hairline-strong px-4 py-2 text-sm font-medium text-ink transition-colors hover:bg-surface"
      >
        Sign out
      </button>
    </form>
  );
}
