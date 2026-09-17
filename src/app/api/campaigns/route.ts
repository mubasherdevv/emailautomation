import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { CreateCampaignSchema } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    let supabaseCampaigns: any[] = [];
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock") &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
    ) {
      try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
          .from("campaigns")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          supabaseCampaigns = data;
        }
      } catch (e) {
        console.error("Supabase campaigns fetch error:", e);
      }
    }

    // Merge Supabase and in-memory campaigns by id so no campaign is ever missing.
    // Supabase is the source of truth for live fields (status, counts, timestamps).
    // In-memory only supplements fields that aren't in Supabase (source_type, selected_contact_ids).
    const map = new Map<string, any>();
    for (const c of store.campaigns) {
      if (c.id) map.set(c.id, c);
    }
    for (const c of supabaseCampaigns) {
      if (c.id) {
        const local = map.get(c.id);
        // Supabase wins for all live/status fields; local only fills in memory-only fields
        map.set(c.id, {
          // Start with local for non-DB fields
          source_type: local?.source_type || "sheets",
          selected_contact_ids: local?.selected_contact_ids || [],
          // Supabase data overrides everything else
          ...c,
        });
      }
    }

    const all = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return NextResponse.json({ campaigns: all });
  } catch {
    return NextResponse.json({ campaigns: store.campaigns || [] });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const result = CreateCampaignSchema.safeParse(json);

    if (!result.success) {
      return NextResponse.json(
        { error: "Validation failed", details: result.error.format() },
        { status: 400 }
      );
    }

    const {
      name,
      sourceType,
      sheetId,
      sheetName,
      selectedContactIds,
      templateId,
      subject,
      fromName,
      fromEmail,
      sendLimit,
      batchSize,
      delaySeconds,
      primaryRecipientField,
    } = result.data;

    const newCampaign = {
      id: crypto.randomUUID(),
      name,
      status: "draft" as const,
      source_type: sourceType || "sheets",
      selected_contact_ids: selectedContactIds || [],
      send_limit: sendLimit,
      batch_size: batchSize,
      delay_seconds: delaySeconds,
      subject,
      from_name: fromName,
      from_email: fromEmail,
      sheet_id: sheetId || "",
      sheet_name: sheetName || "Sheet1",
      template_id: templateId || null,
      primary_recipient_field: primaryRecipientField,
      total_count: sendLimit,
      sent_count: 0,
      sending_count: 0,
      pending_count: sendLimit,
      failed_count: 0,
      created_at: new Date().toISOString(),
      started_at: null,
      completed_at: null,
      updated_at: new Date().toISOString(),
    };

    // Standard columns for database compatibility
    const dbPayload = {
      id: newCampaign.id,
      name: newCampaign.name,
      status: newCampaign.status,
      send_limit: newCampaign.send_limit,
      batch_size: newCampaign.batch_size,
      delay_seconds: newCampaign.delay_seconds,
      subject: newCampaign.subject,
      from_name: newCampaign.from_name,
      from_email: newCampaign.from_email,
      sheet_id: newCampaign.sheet_id,
      sheet_name: newCampaign.sheet_name,
      template_id: newCampaign.template_id,
      primary_recipient_field: newCampaign.primary_recipient_field,
      total_count: newCampaign.total_count,
      sent_count: newCampaign.sent_count,
      sending_count: newCampaign.sending_count,
      pending_count: newCampaign.pending_count,
      failed_count: newCampaign.failed_count,
      created_at: newCampaign.created_at,
      started_at: newCampaign.started_at,
      completed_at: newCampaign.completed_at,
      updated_at: newCampaign.updated_at,
    };

    // Try Supabase insertion
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
    ) {
      try {
        const supabase = createAdminClient();
        // First attempt with full object
        const { error: insertErr } = await supabase.from("campaigns").insert([newCampaign]);
        if (insertErr) {
          // Fallback to strict DB schema columns
          await supabase.from("campaigns").insert([dbPayload]);
        }

        // Also persist contact links to campaign_contacts pivot table
        if (sourceType === "contacts" && selectedContactIds && selectedContactIds.length > 0) {
          try {
            const { data: cRows } = await supabase
              .from("contacts")
              .select("id, email")
              .in("id", selectedContactIds);

            if (cRows && cRows.length > 0) {
              const pivotRows = cRows.map((c) => ({
                campaign_id: newCampaign.id,
                contact_id: c.id,
                recipient_email: c.email,
                status: "pending",
              }));
              await supabase.from("campaign_contacts").upsert(pivotRows, { onConflict: "campaign_id,contact_id" });
            }
          } catch (pivotErr) {
            console.error("Error linking campaign_contacts:", pivotErr);
          }
        }
      } catch (e) {
        console.error("Supabase campaign insertion error:", e);
      }
    }

    // Keep in-memory store synchronized immediately
    store.campaigns.unshift(newCampaign);

    return NextResponse.json({ campaign: newCampaign }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
