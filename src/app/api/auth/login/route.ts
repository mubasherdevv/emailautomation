import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { checkLoginRateLimit, resetLoginRateLimit, signSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    // Extract client IP for rate limiting
    const forwardedFor = request.headers.get("x-forwarded-for");
    const clientIp = forwardedFor ? forwardedFor.split(",")[0].trim() : "127.0.0.1";

    // Enforce brute-force rate limit (max 5 attempts per 5 minutes)
    const rateCheck = checkLoginRateLimit(clientIp);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: "Too many failed login attempts. Please wait 5 minutes before trying again." },
        { status: 429 }
      );
    }

    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
    }

    const defaultEmail = process.env.ADMIN_DEFAULT_EMAIL || "emailautomation@redvision.com";
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || "redvision123";

    // Direct verified admin credentials match
    if (email.toLowerCase() === defaultEmail.toLowerCase() && password === defaultPassword) {
      resetLoginRateLimit(clientIp);
      const signedToken = await signSession(`admin:${Date.now()}`);

      const cookieStore = await cookies();
      cookieStore.set("admin_session", signedToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });

      return NextResponse.json({
        success: true,
        user: { id: "admin-1", email: defaultEmail, role: "admin" },
      });
    }

    // Check if Supabase Auth is actively connected
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock") &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
    ) {
      const supabase = await createClient();
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (!error && data?.user) {
        resetLoginRateLimit(clientIp);
        const signedToken = await signSession(`user:${data.user.id}:${Date.now()}`);

        const cookieStore = await cookies();
        cookieStore.set("admin_session", signedToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
        });

        return NextResponse.json({ success: true, user: data.user });
      }
    }

    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Authentication failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
