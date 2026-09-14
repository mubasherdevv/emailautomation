import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
    ) {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("campaigns")
        .select("*")
        .eq("id", id)
        .single();

      if (!error && data) {
        return NextResponse.json({ campaign: data });
      }
    }

    const campaign = store.campaigns.find((c) => c.id === id);
    if (!campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    return NextResponse.json({ campaign });
  } catch {
    const campaign = store.campaigns.find((c) => c.id === id);
    return NextResponse.json({ campaign });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
    ) {
      const supabase = createAdminClient();
      // First clean child records to ensure foreign key constraints don't block deletion
      await supabase.from("campaign_events").delete().eq("campaign_id", id);
      await supabase.from("campaign_contacts").delete().eq("campaign_id", id);
      await supabase.from("email_logs").delete().eq("campaign_id", id);
      
      const { error } = await supabase.from("campaigns").delete().eq("id", id);
      if (error) {
        console.error("Supabase campaign delete error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    const index = store.campaigns.findIndex((c) => c.id === id);
    if (index !== -1) {
      store.campaigns.splice(index, 1);
    }

    return NextResponse.json({ success: true, message: "Campaign deleted" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Deletion failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
