import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    let campaign = store.campaigns.find((c) => c.id === id);
    if (!campaign && process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")) {
      const supabase = createAdminClient();
      const { data } = await supabase.from("campaigns").select("*").eq("id", id).single();
      if (data) {
        campaign = data as import("@/types").Campaign;
        store.campaigns.push(campaign);
      }
    }

    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.status === "running") {
      return NextResponse.json(
        { error: "Campaign is already running" },
        { status: 400 }
      );
    }

    // Update status to running
    campaign.status = "running";
    campaign.started_at = new Date().toISOString();
    campaign.updated_at = new Date().toISOString();

    // Fetch template HTML body if attached to campaign or fetch most recent template
    let htmlBody = "";
    let textBody = "";
    if (process.env.NEXT_PUBLIC_SUPABASE_URL && !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")) {
      const supabase = createAdminClient();
      if (campaign.template_id) {
        const { data } = await supabase.from("email_templates").select("*").eq("id", campaign.template_id).single();
        if (data) {
          htmlBody = data.html_body;
          textBody = data.text_body;
        }
      }
      if (!htmlBody) {
        const { data } = await supabase.from("email_templates").select("*").order("created_at", { ascending: false }).limit(1);
        if (data && data.length > 0) {
          htmlBody = data[0].html_body;
          textBody = data[0].text_body;
        }
      }
    }

    // Prepare secure payload for n8n automation engine
    const n8nPayload = {
      campaignId: campaign.id,
      campaignName: campaign.name,
      sendLimit: campaign.send_limit,
      batchSize: campaign.batch_size,
      delaySeconds: campaign.delay_seconds,
      subject: campaign.subject,
      from: `${campaign.from_name} <${campaign.from_email}>`,
      fromName: campaign.from_name,
      fromEmail: campaign.from_email,
      sheetId: campaign.sheet_id,
      sheetName: campaign.sheet_name,
      primaryRecipientField: campaign.primary_recipient_field,
      htmlBody: htmlBody || "<p>Hi {{firstName}}, hope you are well!</p>",
      textBody: textBody || "",
    };

    const n8nWebhookUrl = process.env.N8N_WEBHOOK_URL;
    const n8nSecret = process.env.N8N_WEBHOOK_SECRET || "dev_secret_campaign_key_2026";

    let n8nTriggerStatus = "simulated_local";

    // Call n8n webhook if URL is configured
    if (n8nWebhookUrl && !n8nWebhookUrl.includes("example.com")) {
      try {
        const res = await fetch(n8nWebhookUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Campaign-Secret": n8nSecret,
          },
          body: JSON.stringify(n8nPayload),
        });
        n8nTriggerStatus = res.ok ? "triggered" : `failed_http_${res.status}`;
      } catch (err: unknown) {
        n8nTriggerStatus = `connection_error: ${err instanceof Error ? err.message : "unreachable"}`;
      }
    }

    // Insert campaign event for live activity stream
    const event = {
      id: crypto.randomUUID(),
      campaign_id: campaign.id,
      event_type: "campaign_started" as const,
      email: null,
      message: `Campaign started with limit ${campaign.send_limit} and batch size ${campaign.batch_size}`,
      metadata: { ...n8nPayload, n8nTriggerStatus },
      created_at: new Date().toISOString(),
    };

    store.events.unshift(event);

    // Sync to Supabase if connected
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
    ) {
      const supabase = createAdminClient();
      await supabase
        .from("campaigns")
        .update({
          status: "running",
          started_at: campaign.started_at,
          updated_at: campaign.updated_at,
        })
        .eq("id", id);

      await supabase.from("campaign_events").insert([event]);
    }

    return NextResponse.json({
      success: true,
      message: "Campaign started successfully and dispatched to n8n",
      campaign,
      n8nTriggerStatus,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to start campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
