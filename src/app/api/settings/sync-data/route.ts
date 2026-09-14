import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  try {
    const body = await request.json().catch(() => ({}));
    let url = body.supabaseUrl || process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    let serviceKey = body.supabaseServiceKey || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    if (serviceKey.includes("••••")) {
      serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";
    }

    if (!url || !serviceKey) {
      return NextResponse.json(
        { success: false, error: "Supabase URL and API Key are required to sync data." },
        { status: 400 }
      );
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      url = `https://${url}`;
    }

    const client = createClient(url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const counts = {
      campaigns: 0,
      contacts: 0,
      templates: 0,
      logs: 0,
      events: 0,
    };

    // 1. Fetch campaigns
    try {
      const { data: campaigns } = await client.from("campaigns").select("*").order("created_at", { ascending: false });
      if (campaigns && campaigns.length > 0) {
        store.campaigns = campaigns;
        counts.campaigns = campaigns.length;
      }
    } catch {}

    // 2. Fetch contacts
    try {
      const { data: contacts } = await client.from("contacts").select("*").order("created_at", { ascending: false });
      if (contacts && contacts.length > 0) {
        store.contacts = contacts;
        counts.contacts = contacts.length;
      }
    } catch {}

    // 3. Fetch templates
    try {
      const { data: templates } = await client.from("email_templates").select("*").order("created_at", { ascending: false });
      if (templates && templates.length > 0) {
        store.templates = templates;
        counts.templates = templates.length;
      }
    } catch {}

    // 4. Fetch email_logs
    try {
      const { data: logs } = await client.from("email_logs").select("*").order("created_at", { ascending: false }).limit(100);
      if (logs && logs.length > 0) {
        store.logs = logs;
        counts.logs = logs.length;
      }
    } catch {}

    // 5. Fetch events
    try {
      const { data: events } = await client.from("campaign_events").select("*").order("created_at", { ascending: false }).limit(50);
      if (events && events.length > 0) {
        store.events = events;
        counts.events = events.length;
      }
    } catch {}

    return NextResponse.json({
      success: true,
      counts,
      message: `Synchronized from Supabase: ${counts.campaigns} campaigns, ${counts.contacts} contacts, ${counts.templates} templates, and ${counts.logs} logs.`,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Sync failed";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
