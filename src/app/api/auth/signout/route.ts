import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch {
    // Auth unconfigured — treat as signed out.
  }
  const { origin } = new URL(req.url);
  return NextResponse.redirect(`${origin}/`, { status: 303 });
}
