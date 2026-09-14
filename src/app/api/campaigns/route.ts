import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { CreateCampaignSchema } from "@/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    // If Supabase is connected with real database, query Supabase
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock") &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("placeholder")
    ) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        return NextResponse.json({ campaigns: data });
      }
    }

    return NextResponse.json({ campaigns: store.campaigns || [] });
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
      sheetId,
      sheetName,
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
      send_limit: sendLimit,
      batch_size: batchSize,
      delay_seconds: delaySeconds,
      subject,
      from_name: fromName,
      from_email: fromEmail,
      sheet_id: sheetId,
      sheet_name: sheetName,
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

    // Try Supabase insertion
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
    ) {
      const supabase = createAdminClient();
      await supabase.from("campaigns").insert([newCampaign]);
    }

    // Keep store synchronized
    store.campaigns.unshift(newCampaign);

    return NextResponse.json({ campaign: newCampaign }, { status: 201 });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to create campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
