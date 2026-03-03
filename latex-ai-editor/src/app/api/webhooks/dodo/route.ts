import { NextRequest, NextResponse } from "next/server";
import { Webhook, WebhookVerificationError } from "standardwebhooks";
import { env } from "@/lib/env";
import { userRepository } from "@/repositories/user-repository";
import { planFromProductId } from "@/lib/billing-config";

const SUBSCRIPTION_EVENTS = [
  "subscription.active",
  "subscription.updated",
  "subscription.renewed",
  "subscription.on_hold",
  "subscription.failed",
  "subscription.cancelled",
  "subscription.expired",
] as const;

type SubscriptionEventType = (typeof SUBSCRIPTION_EVENTS)[number];

function isSubscriptionEvent(type: string): type is SubscriptionEventType {
  return SUBSCRIPTION_EVENTS.includes(type as SubscriptionEventType);
}

interface DodoWebhookData {
  payload_type?: string;
  subscription_id?: string;
  customer_id?: string;
  status?: string;
  metadata?: Record<string, string>;
  customer?: { email?: string };
  product_id?: string;
  items?: Array<{ product_id?: string }>;
}

export async function POST(req: NextRequest) {
  const webhookKey = env.DODO_PAYMENTS_WEBHOOK_KEY;
  if (!webhookKey) {
    return NextResponse.json(
      { error: "Webhook not configured" },
      { status: 501 }
    );
  }

  let rawBody: string;
  try {
    rawBody = await req.text();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const webhookId = req.headers.get("webhook-id");
  const webhookSignature = req.headers.get("webhook-signature");
  const webhookTimestamp = req.headers.get("webhook-timestamp");
  if (!webhookId || !webhookSignature || !webhookTimestamp) {
    return NextResponse.json(
      { error: "Missing webhook headers" },
      { status: 401 }
    );
  }

  let event: { type?: string; data?: DodoWebhookData };
  try {
    const webhook = new Webhook(webhookKey);
    event = webhook.verify(rawBody, {
      "webhook-id": webhookId,
      "webhook-signature": webhookSignature,
      "webhook-timestamp": webhookTimestamp,
    }) as { type?: string; data?: DodoWebhookData };
  } catch (err) {
    if (err instanceof WebhookVerificationError) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
    throw err;
  }

  if (!event?.type) {
    return NextResponse.json({ received: true });
  }

  if (!isSubscriptionEvent(event.type)) {
    return NextResponse.json({ received: true });
  }

  const data = event.data;
  if (!data) {
    return NextResponse.json({ received: true });
  }

  let userId: string | null = null;
  const metadata = data.metadata ?? {};
  if (metadata.clerk_user_id) {
    userId = metadata.clerk_user_id;
  }
  if (!userId && data.customer_id) {
    const userByDodo = await userRepository.findByDodoCustomerId(
      data.customer_id
    );
    if (userByDodo) userId = userByDodo.id;
  }
  if (!userId && data.customer?.email) {
    const userByEmail = await userRepository.findByEmail(
      data.customer.email
    );
    if (userByEmail) userId = userByEmail.id;
  }

  if (!userId) {
    console.warn("Dodo webhook: could not resolve user for event", event.type);
    return NextResponse.json({ received: true });
  }

  const productId =
    data.product_id ?? data.items?.[0]?.product_id;
  const plan = productId ? planFromProductId(productId) : null;
  const status = data.status ?? null;

  const isActive =
    event.type === "subscription.active" ||
    event.type === "subscription.updated" ||
    event.type === "subscription.renewed";
  const isInactive =
    event.type === "subscription.cancelled" ||
    event.type === "subscription.expired" ||
    event.type === "subscription.failed";

  const newPlan = isInactive ? "free" : (plan ?? "pro");
  const newStatus = isInactive ? (status ?? "cancelled") : status;

  await userRepository.updateDodoSubscription(userId, {
    plan: newPlan,
    subscriptionStatus: newStatus,
    dodoCustomerId: data.customer_id ?? undefined,
    dodoSubscriptionId: data.subscription_id ?? undefined,
  });

  return NextResponse.json({ received: true });
}
