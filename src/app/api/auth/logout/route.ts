import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
    ) {
      const supabase = await createClient();
      await supabase.auth.signOut();
    }

    const cookieStore = await cookies();
    cookieStore.delete("admin_session");
    cookieStore.delete("sb-access-token");
    cookieStore.delete("sb-refresh-token");

    return NextResponse.json({ success: true, message: "Logged out" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Logout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
