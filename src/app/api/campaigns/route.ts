import { store } from "@/lib/store";
import { Campaign, CreateCampaignSchema } from "@/types";
import { createAdminClient, isSupabaseConfigured } from "@/lib/supabase/admin";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function GET() {
  try {
    let supabaseCampaigns: Campaign[] = [];
    if (isSupabaseConfigured()) {
      try {
        const supabase = createAdminClient();
        const { data, error } = await supabase
          .from("campaigns")
          .select("*")
          .order("created_at", { ascending: false });

        if (!error && Array.isArray(data)) {
          supabaseCampaigns = data as Campaign[];
        }
      } catch (e) {
        console.error("Supabase campaigns fetch error:", e);
      }
    }

    // Merge Supabase and in-memory campaigns by id so no campaign is ever missing.
    // Supabase is the source of truth for live fields (status, counts, timestamps).
    // In-memory supplements memory-only fields (source_type, selected_contact_ids).
    const map = new Map<string, Campaign>();
    for (const c of store.campaigns) {
      if (c.id) map.set(c.id, c);
    }
    for (const c of supabaseCampaigns) {
      if (c.id) {
        const local = map.get(c.id);
        map.set(c.id, {
          source_type: local?.source_type || "sheets",
          selected_contact_ids: local?.selected_contact_ids || [],
          ...c,
        });
      }
    }

    const all = Array.from(map.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    return successResponse({ campaigns: all });
  } catch (err) {
    console.error("Campaigns GET error:", err);
    return successResponse({ campaigns: store.campaigns || [] });
  }
}

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const result = CreateCampaignSchema.safeParse(json);

    if (!result.success) {
      return errorResponse("Validation failed", 400, result.error.format());
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

    const newCampaign: Campaign = {
      id: crypto.randomUUID(),
      name,
      status: "draft",
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

    // Standard columns for database schema compatibility
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

    if (isSupabaseConfigured()) {
      try {
        const supabase = createAdminClient();
        const { error: insertErr } = await supabase.from("campaigns").insert([newCampaign]);
        if (insertErr) {
          await supabase.from("campaigns").insert([dbPayload]);
        }

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
              await supabase
                .from("campaign_contacts")
                .upsert(pivotRows, { onConflict: "campaign_id,contact_id" });
            }
          } catch (pivotErr) {
            console.error("Error linking campaign_contacts:", pivotErr);
          }
        }
      } catch (e) {
        console.error("Supabase campaign insertion error:", e);
      }
    }

    store.campaigns.unshift(newCampaign);

    return successResponse({ campaign: newCampaign }, 201);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create campaign";
    return errorResponse(message, 500);
  }
}

