import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Client } from "pg";
import { createClient } from "@supabase/supabase-js";

function extractProjectRef(url: string): string {
  try {
    const parsed = new URL(url.startsWith("http") ? url : `https://${url}`);
    return parsed.hostname.split(".")[0] || "";
  } catch {
    return "";
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    let url = body.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    let serviceKey = body.supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    let dbPassword = body.dbPassword || process.env.SUPABASE_DB_PASSWORD || "";
    let dbConnectionString = body.dbConnectionString || process.env.SUPABASE_DB_URL || "";

    if (serviceKey.includes("••••")) {
      serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    }

    const schemaPath = path.join(process.cwd(), "supabase_schema.sql");
    if (!fs.existsSync(schemaPath)) {
      return NextResponse.json({ success: false, error: "supabase_schema.sql not found." }, { status: 404 });
    }
    const sqlContent = fs.readFileSync(schemaPath, "utf-8");

    const projectRef = extractProjectRef(url);

    // Method 1: If direct database password or connection string is provided, execute directly via pg driver!
    let executedDirectly = false;
    let directError: string | null = null;

    let targetConn = dbConnectionString;
    if (!targetConn && dbPassword && projectRef) {
      // Direct pooled or direct connection to Supabase Postgres
      targetConn = `postgres://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`;
    }

    if (targetConn) {
      try {
        const pgClient = new Client({
          connectionString: targetConn,
          ssl: { rejectUnauthorized: false },
          connectionTimeoutMillis: 10000,
        });
        await pgClient.connect();
        await pgClient.query(sqlContent);
        await pgClient.end();
        executedDirectly = true;
      } catch (err: unknown) {
        directError = err instanceof Error ? err.message : "Direct Postgres connection failed";
      }
    }

    // Method 2: Check active tables using Supabase JS client
    const client = createClient(url, serviceKey || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "", {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const tables = ["campaigns", "contacts", "campaign_contacts", "email_logs", "email_templates", "suppression_list", "campaign_events"];
    const existingTables: string[] = [];
    const missingTables: string[] = [];

    for (const table of tables) {
      try {
        const { error } = await client.from(table).select("id").limit(1);
        if (!error || error.code === "PGRST116" || error.message.includes("0 rows")) {
          existingTables.push(table);
        } else {
          missingTables.push(table);
        }
      } catch {
        missingTables.push(table);
      }
    }

    const sqlEditorUrl = projectRef ? `https://supabase.com/dashboard/project/${projectRef}/sql/new` : "https://supabase.com/dashboard";

    return NextResponse.json({
      success: true,
      executedDirectly,
      directError,
      projectRef,
      sqlEditorUrl,
      existingTables,
      missingTables,
      sqlContent,
      message: executedDirectly
        ? `Successfully executed supabase_schema.sql directly into PostgreSQL! All tables are active.`
        : missingTables.length === 0
        ? `All ${existingTables.length} tables are already present in Supabase.`
        : `Supabase PostgREST requires SQL DDL to be run via database connection or SQL Editor. Use the 1-Click Copy or enter your DB Password.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Schema execution failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
