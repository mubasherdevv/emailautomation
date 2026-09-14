import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const startTime = Date.now();
  try {
    const body = await request.json();
    let url = body.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    let key = body.supabaseAnonKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    let serviceKey = body.supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    // If key has mask characters, fallback to env
    if (key.includes("••••")) key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    if (serviceKey.includes("••••")) serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

    if (!url) {
      return NextResponse.json(
        { success: false, error: "Supabase Project URL is required" },
        { status: 400 }
      );
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    // Ping Supabase Health/REST API
    const testKey = serviceKey || key;
    if (!testKey) {
      return NextResponse.json(
        { success: false, error: "At least one valid API Key (Anon or Service Role) is required to verify access" },
        { status: 400 }
      );
    }

    const client = createClient(url, testKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check tables existence by testing queries
    const tablesToCheck = ["campaigns", "contacts", "email_logs", "campaign_events", "email_templates"];
    const detectedTables: string[] = [];
    const missingTables: string[] = [];

    for (const table of tablesToCheck) {
      try {
        const { error } = await client.from(table).select("id").limit(1);
        if (!error || error.code === "PGRST116" || error.message.includes("Results contain 0 rows")) {
          detectedTables.push(table);
        } else if (error.code === "42P01" || error.message.includes("relation") || error.message.includes("does not exist")) {
          missingTables.push(table);
        } else {
          // Permitted or exists
          detectedTables.push(table);
        }
      } catch {
        missingTables.push(table);
      }
    }

    const latency = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      url,
      latency: `${latency}ms`,
      detectedTables,
      missingTables,
      schemaReady: missingTables.length === 0,
      message: missingTables.length === 0
        ? `Supabase connection verified! All ${detectedTables.length} core tables active.`
        : `Connected to Supabase, but ${missingTables.length} tables are missing. Please run supabase_schema.sql in the SQL Editor.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Supabase connection test failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
