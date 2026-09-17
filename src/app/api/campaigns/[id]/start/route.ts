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
        const { data } = await supabase.from("email_templates").select("*").eq("id", campaign.template_id).maybeSingle();
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

    if (!htmlBody && campaign.template_id) {
      const memTpl = store.templates.find((t) => t.id === campaign.template_id);
      if (memTpl) {
        htmlBody = memTpl.html_body || "";
        textBody = memTpl.text_body || "";
      }
    }

    // Resolve leads if campaign uses contacts directory
    let leads: Array<{
      "First Name": string;
      "Last Name": string;
      "Email": string;
      "Personal Email": string;
      "Website": string;
      "Address": string;
      "Contact": string;
    }> = [];

    const isContactsSource = 
      campaign.source_type === "contacts" || 
      campaign.sheet_id === "contacts_source" || 
      campaign.sheet_id?.startsWith("contacts");

    if (isContactsSource) {
      let idList = campaign.selected_contact_ids || [];
      const idSet = new Set(idList);
      let matchedContacts: any[] = idSet.size > 0 
        ? store.contacts.filter((c) => idSet.has(c.id))
        : [];

      if (
        matchedContacts.length === 0 &&
        process.env.NEXT_PUBLIC_SUPABASE_URL &&
        !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
      ) {
        try {
          const supabase = createAdminClient();
          
          // First check campaign_contacts pivot table
          if (idList.length === 0) {
            const { data: ccData } = await supabase
              .from("campaign_contacts")
              .select("contact_id")
              .eq("campaign_id", campaign.id);
            if (ccData && ccData.length > 0) {
              idList = ccData.map((r) => r.contact_id);
            }
          }

          let q = supabase.from("contacts").select("*");
          if (idList.length > 0) {
            q = q.in("id", idList);
          } else {
            // Default to all pending contacts up to send_limit
            q = q.eq("status", "pending").limit(campaign.send_limit || 100);
          }
          const { data } = await q;
          if (data && Array.isArray(data)) {
            matchedContacts = data;
          }
        } catch (e) {
          console.error("Error fetching campaign contacts from Supabase", e);
        }
      }

      leads = matchedContacts.map((c) => ({
        "First Name": c.first_name || "",
        "Last Name": c.last_name || "",
        "Email": c.email || "",
        "Personal Email": c.personal_email || "",
        "Website": c.website || "",
        "Address": c.address || "",
        "Contact": c.contact || "",
      })).filter((l) => Boolean(l.Email && l.Email.includes("@")));

      if (leads.length === 0) {
        return NextResponse.json(
          { error: "No recipient contacts found for this campaign. Please select contacts with valid email addresses." },
          { status: 400 }
        );
      }
    }

    // Prepare secure payload for n8n automation engine
    const n8nPayload = {
      campaignId: campaign.id,
      campaignName: campaign.name,
      sourceType: isContactsSource ? "contacts" : (campaign.source_type || "sheets"),
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
      leads: leads,
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
