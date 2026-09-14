import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

export async function GET() {
  try {
    const cookieStore = await cookies();
    const hasAdminSession = cookieStore.get("admin_session")?.value === "active";

    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
    ) {
      const supabase = await createClient();
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        return NextResponse.json({ authenticated: true, user: data.user });
      }
    }

    if (hasAdminSession) {
      return NextResponse.json({
        authenticated: true,
        user: { email: process.env.ADMIN_DEFAULT_EMAIL || "admin@company.com", role: "admin" },
      });
    }

    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  } catch {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }
}
