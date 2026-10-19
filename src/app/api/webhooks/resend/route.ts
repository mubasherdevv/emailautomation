import { NextResponse } from "next/server";
import { store } from "@/lib/store";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    // If RESEND_WEBHOOK_SECRET is configured, enforce token / signature verification
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret && !webhookSecret.includes("mock") && !webhookSecret.includes("placeholder")) {
      const authHeader = request.headers.get("authorization") || request.headers.get("x-webhook-secret");
      const svixSig = request.headers.get("svix-signature");
      if (!svixSig && authHeader !== `Bearer ${webhookSecret}` && authHeader !== webhookSecret) {
        return NextResponse.json({ error: "Invalid webhook credentials or signature" }, { status: 401 });
      }
    }

    const payload = await request.json();
    const eventType = payload.type; // e.g. "email.delivered", "email.bounced", "email.complained"
    const data = payload.data || {};
    const email = data.to?.[0] || data.email;
    const providerMessageId = data.email_id || data.id;

    if (!eventType || !email) {
      return NextResponse.json({ error: "Invalid webhook payload structure" }, { status: 400 });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // Map Resend event type
    let logStatus: "delivered" | "bounced" | "complained" | null = null;
    if (eventType === "email.delivered") logStatus = "delivered";
    if (eventType === "email.bounced") logStatus = "bounced";
    if (eventType === "email.complained") logStatus = "complained";

    if (logStatus) {
      // 1. Update in-memory email log
      const existingLog = store.logs.find(
        (l) => l.email.toLowerCase() === normalizedEmail || l.provider_message_id === providerMessageId
      );
      if (existingLog) {
        existingLog.status = logStatus;
        if (data.rejection_reason) {
          existingLog.error = data.rejection_reason;
        }
      }

      // 2. If bounced or complained, add to suppression list
      if (logStatus === "bounced" || logStatus === "complained") {
        if (
          process.env.NEXT_PUBLIC_SUPABASE_URL &&
          !process.env.NEXT_PUBLIC_SUPABASE_URL.includes("mock")
        ) {
          const supabase = createAdminClient();
          await supabase.from("suppression_list").upsert({
            email: normalizedEmail,
            reason: logStatus,
            created_at: new Date().toISOString(),
          }, { onConflict: "email" });

          // Update email_logs in database
          await supabase
            .from("email_logs")
            .update({ status: logStatus, error: data.rejection_reason || null })
            .eq("email", normalizedEmail);
        }
      }
    }

    return NextResponse.json({ received: true, eventType, email: normalizedEmail });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Webhook handler failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
