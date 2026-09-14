import { NextResponse } from "next/server";
import { store } from "@/lib/store";

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get("campaignId") || store.campaigns[0]?.id;

    const campaign = store.campaigns.find((c) => c.id === campaignId);
    if (!campaign) {
      return NextResponse.json({ error: "No campaign available to simulate" }, { status: 404 });
    }

    const testEmails = [
      "alex.turner@arctic-tech.io",
      "rachel.green@fashion-forward.com",
      "bruce.wayne@wayne-enterprises.net",
      "clark.kent@daily-planet.press",
      "tony.stark@stark-industries.com",
    ];

    const randomEmail = testEmails[Math.floor(Math.random() * testEmails.length)];
    const isSuccess = Math.random() > 0.2; // 80% success, 20% failure

    // 1. Sending event
    const sendingEvent = {
      id: crypto.randomUUID(),
      campaign_id: campaign.id,
      event_type: "email_sending" as const,
      email: randomEmail,
      message: "Dispatching via Resend API",
      metadata: { batchId: `batch_${Date.now()}` },
      created_at: new Date().toISOString(),
    };
    store.events.unshift(sendingEvent);

    // 2. Sent or Failed outcome
    const outcomeEvent = {
      id: crypto.randomUUID(),
      campaign_id: campaign.id,
      event_type: isSuccess ? ("email_sent" as const) : ("email_failed" as const),
      email: randomEmail,
      message: isSuccess ? "Email delivered successfully" : "Domain MX record unreachable",
      metadata: isSuccess
        ? { messageId: `msg_resend_${Date.now()}` }
        : { error: "Unreachable mail server" },
      created_at: new Date(Date.now() + 1000).toISOString(),
    };
    store.events.unshift(outcomeEvent);

    // Update campaign counters atomically
    if (isSuccess) {
      campaign.sent_count += 1;
      campaign.pending_count = Math.max(0, campaign.pending_count - 1);
      campaign.sending_count = Math.max(0, campaign.sending_count - 1);

      store.logs.unshift({
        id: crypto.randomUUID(),
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        email: randomEmail,
        status: "sent",
        provider_message_id: `msg_resend_${Date.now()}`,
        error: null,
        sent_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
      });
    } else {
      campaign.failed_count += 1;
      campaign.pending_count = Math.max(0, campaign.pending_count - 1);
      campaign.sending_count = Math.max(0, campaign.sending_count - 1);

      store.logs.unshift({
        id: crypto.randomUUID(),
        campaign_id: campaign.id,
        campaign_name: campaign.name,
        email: randomEmail,
        status: "failed",
        provider_message_id: null,
        error: "Unreachable mail server",
        sent_at: null,
        created_at: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      simulatedRecipient: randomEmail,
      status: isSuccess ? "sent" : "failed",
      updatedCounters: {
        sent: campaign.sent_count,
        pending: campaign.pending_count,
        failed: campaign.failed_count,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Simulation failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
