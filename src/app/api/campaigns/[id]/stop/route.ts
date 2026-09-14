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

    campaign.status = "stopped";
    campaign.updated_at = new Date().toISOString();

    const event = {
      id: crypto.randomUUID(),
      campaign_id: campaign.id,
      event_type: "campaign_stopped" as const,
      email: null,
      message: "Campaign permanently halted by administrator",
      metadata: {},
      created_at: new Date().toISOString(),
    };

    store.events.unshift(event);

    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
    ) {
      const supabase = createAdminClient();
      await supabase
        .from("campaigns")
        .update({ status: "stopped", updated_at: campaign.updated_at })
        .eq("id", id);

      await supabase.from("campaign_events").insert([event]);
    }

    return NextResponse.json({
      success: true,
      message: "Campaign stopped. No further batches will be dispatched.",
      campaign,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to stop campaign";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
