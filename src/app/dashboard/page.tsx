import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/components/auth/sign-out-button";
import { UploadDropzone } from "@/components/dashboard/upload-dropzone";
import { getSessionUser } from "@/lib/session";
import { listDocumentsForUser } from "@/lib/documents/repository";

export const metadata: Metadata = { title: "Dashboard — Clause" };
export const dynamic = "force-dynamic";

function StatusChip({ status }: { status: string }) {
  const cls =
    status === "ready"
      ? "bg-cream-deeper text-ink"
      : status === "failed"
        ? "bg-primary text-white"
        : "bg-hairline text-ink-tint";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${cls}`}>
      {status}
    </span>
  );
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const list = await listDocumentsForUser(user.id);

  return (
    <main className="flex min-h-screen flex-col">
      <header className="border-b border-hairline-soft">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Link href="/" className="display-font text-xl tracking-tight no-underline">
            Clause<span className="text-primary">_</span>
          </Link>
          <div className="flex items-center gap-4">
            <span className="text-sm text-steel">{user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>

      <section className="mx-auto w-full max-w-6xl flex-1 px-6 py-10">
        <h1 className="display-font mb-2 text-4xl tracking-tight">Your documents</h1>
        <p className="mb-8 text-base leading-relaxed text-steel">
          Analysis is informational only — not legal advice.
        </p>

        <div className="mb-10">
          <UploadDropzone />
        </div>

        {list.items.length === 0 ? (
          <p className="rounded-lg border border-hairline-soft bg-surface p-6 text-center text-sm text-steel">
            No documents yet. Upload your first PDF above.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="border-b border-hairline text-xs uppercase tracking-wide text-stone">
                  <th className="py-2 pr-4 font-semibold">Filename</th>
                  <th className="py-2 pr-4 font-semibold">Status</th>
                  <th className="py-2 pr-4 font-semibold">Pages</th>
                  <th className="py-2 font-semibold">Uploaded</th>
                </tr>
              </thead>
              <tbody>
                {list.items.map((doc) => (
                  <tr key={doc.id} className="border-b border-hairline-soft hover:bg-surface">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="font-medium text-ink no-underline hover:text-primary"
                      >
                        {doc.originalFilename}
                      </Link>
                    </td>
                    <td className="py-3 pr-4"><StatusChip status={doc.status} /></td>
                    <td className="py-3 pr-4 text-sm text-steel">{doc.pageCount ?? "—"}</td>
                    <td className="py-3 text-sm text-steel">
                      {new Date(doc.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {list.nextCursor && (
          <p className="mt-4 text-xs text-steel">
            Showing the most recent {list.items.length} documents.
          </p>
        )}
      </section>

      <div className="sunset-stripe h-8 w-full" aria-hidden="true" />
    </main>
  );
}
