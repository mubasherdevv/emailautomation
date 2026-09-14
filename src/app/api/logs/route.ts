import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const campaignId = searchParams.get("campaignId");
  const status = searchParams.get("status");
  const search = searchParams.get("search")?.toLowerCase();

  try {
    if (
      process.env.NEXT_PUBLIC_SUPABASE_URL &&
      !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
    ) {
      const supabase = createAdminClient();
      let query = supabase.from("email_logs").select("*, campaigns(name)").order("created_at", { ascending: false });

      if (campaignId && campaignId !== "all") {
        query = query.eq("campaign_id", campaignId);
      }
      if (status && status !== "all") {
        query = query.eq("status", status);
      }
      if (search) {
        query = query.or(`email.ilike.%${search}%,provider_message_id.ilike.%${search}%`);
      }

      const { data } = await query;
      if (data) {
        const formatted = data.map((item: any) => ({
          ...item,
          campaign_name: item.campaigns?.name || "Unknown Campaign",
        }));
        return NextResponse.json({ logs: formatted });
      }
    }

    let results = [...(store.logs || [])];

    if (campaignId && campaignId !== "all") {
      results = results.filter((l) => l.campaign_id === campaignId);
    }
    if (status && status !== "all") {
      results = results.filter((l) => l.status === status);
    }
    if (search) {
      results = results.filter(
        (l) =>
          l.email.toLowerCase().includes(search) ||
          (l.provider_message_id && l.provider_message_id.toLowerCase().includes(search))
      );
    }

    return NextResponse.json({ logs: results });
  } catch {
    return NextResponse.json({ logs: [] });
  }
}
