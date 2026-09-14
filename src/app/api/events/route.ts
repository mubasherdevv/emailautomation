import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");
  const limit = Number(searchParams.get("limit")) || 30;

  try {
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
    ) {
      const supabase = createAdminClient();
      let query = supabase.from("campaign_events").select("*").order("created_at", { ascending: false }).limit(limit);

      if (campaignId && campaignId !== "all") {
        query = query.eq("campaign_id", campaignId);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) return NextResponse.json({ events: data });
    }

    let events = [...(store.events || [])];
    if (campaignId && campaignId !== "all") {
      events = events.filter((e) => e.campaign_id === campaignId);
    }

    return NextResponse.json({ events: events.slice(0, limit) });
  } catch {
    return NextResponse.json({ events: [] });
  }
}

// Route to simulate or receive live n8n events
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { campaignId, eventType, email, message, metadata } = body;

    if (!campaignId || !eventType) {
      return NextResponse.json({ error: "campaignId and eventType required" }, { status: 400 });
    }

    const newEvent = {
      id: crypto.randomUUID(),
      campaign_id: campaignId,
      event_type: eventType,
      email: email || null,
      message: message || `Event: ${eventType}`,
      metadata: metadata || {},
      created_at: new Date().toISOString(),
    };

    store.events.unshift(newEvent);

    // Also update campaign counters if relevant
    const campaign = store.campaigns.find((c) => c.id === campaignId);
    if (campaign) {
      if (eventType === "email_sending") {
        campaign.sending_count = Math.max(1, campaign.sending_count);
      } else if (eventType === "email_sent") {
        campaign.sent_count += 1;
        campaign.pending_count = Math.max(0, campaign.pending_count - 1);
        campaign.sending_count = Math.max(0, campaign.sending_count - 1);

        // Record log
        store.logs.unshift({
          id: crypto.randomUUID(),
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          email: email || "unknown@recipient.com",
          status: "sent",
          provider_message_id: metadata?.messageId || `msg_${Date.now()}`,
          error: null,
          sent_at: new Date().toISOString(),
          created_at: new Date().toISOString(),
        });
      } else if (eventType === "email_failed") {
        campaign.failed_count += 1;
        campaign.pending_count = Math.max(0, campaign.pending_count - 1);
        campaign.sending_count = Math.max(0, campaign.sending_count - 1);

        store.logs.unshift({
          id: crypto.randomUUID(),
          campaign_id: campaign.id,
          campaign_name: campaign.name,
          email: email || "unknown@recipient.com",
          status: "failed",
          provider_message_id: null,
          error: message || "Delivery error",
          sent_at: null,
          created_at: new Date().toISOString(),
        });
      }

      if (campaign.pending_count === 0 && campaign.total_count > 0) {
        campaign.status = "completed";
        campaign.completed_at = new Date().toISOString();
      }
    }

    return NextResponse.json({ success: true, event: newEvent });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Event recording failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
