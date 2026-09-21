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
        className="rounded-[6px] border border-[#D8D2C6] bg-[#FFFDF7] px-3.5 py-1.5 text-[12px] font-bold text-[#171714] transition-colors hover:bg-[#F3F0E8] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#3157D5]"
      >
        Sign out
      </button>
    </form>
  );
}
