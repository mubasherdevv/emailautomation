import { NextResponse } from "next/server";
import { store } from "@/lib/store";
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
      const { data: logs } = await supabase
        .from("email_logs")
        .select("*")
        .eq("campaign_id", id)
        .order("created_at", { ascending: false });

      const { data: events } = await supabase
        .from("campaign_events")
        .select("*")
        .eq("campaign_id", id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (logs) {
        return NextResponse.json({ logs, events: events || [] });
      }
    }

    const logs = store.logs.filter((l) => l.campaign_id === id);
    const events = store.events.filter((e) => e.campaign_id === id);

    return NextResponse.json({ logs, events });
  } catch {
    const logs = store.logs.filter((l) => l.campaign_id === id);
    const events = store.events.filter((e) => e.campaign_id === id);
    return NextResponse.json({ logs, events });
  }
}
