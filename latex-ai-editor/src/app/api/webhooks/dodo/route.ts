import { NextRequest, NextResponse } from "next/server";
import { Webhook, WebhookVerificationError } from "standardwebhooks";
import { env } from "@/lib/env";
import { handleDodoWebhook, type DodoEnvelope } from "@/services/billing/webhook-service";

/**
 * Dodo Payments webhooks (Standard Webhooks). The signature and timestamp
 * (±5 min) are verified before anything is read; then the event is applied
 * exactly once (see webhook-service). 2xx tells Dodo to stop retrying; a 5xx
 * makes it retry (up to 8 times), which is what we want if the database failed.
 */
export async function POST(req: NextRequest) {
  const webhookKey = env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!webhookKey) return NextResponse.json({ error: "Webhook not configured" }, { status: 501 });

  const rawBody = await req.text().catch(() => null);
  if (rawBody === null) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const headers = {
    "webhook-id": req.headers.get("webhook-id") ?? "",
    "webhook-signature": req.headers.get("webhook-signature") ?? "",
    "webhook-timestamp": req.headers.get("webhook-timestamp") ?? "",
  };
  if (!headers["webhook-id"] || !headers["webhook-signature"] || !headers["webhook-timestamp"]) {
    return NextResponse.json({ error: "Missing webhook headers" }, { status: 401 });
  }

  let envelope: DodoEnvelope;
  try {
    envelope = new Webhook(webhookKey).verify(rawBody, headers) as DodoEnvelope;
  } catch (err) {
    if (err instanceof WebhookVerificationError) return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    throw err;
  }

  try {
    const result = await handleDodoWebhook(headers["webhook-id"], envelope);
    return NextResponse.json({ received: true, outcome: result.outcome });
  } catch (error) {
    console.error(JSON.stringify({ event: "billing_webhook_error", webhookId: headers["webhook-id"], type: envelope.type, error: String(error) }));
    return NextResponse.json({ error: "Processing failed; please retry" }, { status: 500 });
  }
}
