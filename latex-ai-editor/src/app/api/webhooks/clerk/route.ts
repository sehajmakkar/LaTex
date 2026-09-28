import { NextRequest, NextResponse } from "next/server";
import { verifyWebhook } from "@clerk/nextjs/webhooks";
import { deleteAccountData } from "@/services/account-deletion-service";

/**
 * Clerk webhooks (Svix-signed; secret in CLERK_WEBHOOK_SIGNING_SECRET).
 * user.deleted covers accounts deleted outside Vero's own button (Clerk's
 * account screen, the Clerk dashboard): we cancel their subscription and delete
 * their files and data. A failure returns 500 so Clerk retries.
 */
export async function POST(req: NextRequest) {
  if (!process.env.CLERK_WEBHOOK_SIGNING_SECRET) return NextResponse.json({ error: "Webhook not configured" }, { status: 501 });
  let evt: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    evt = await verifyWebhook(req);
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }
  if (evt.type !== "user.deleted") return NextResponse.json({ received: true, ignored: evt.type });
  const userId = evt.data.id;
  if (!userId) return NextResponse.json({ received: true, ignored: "no user id" });
  try {
    const report = await deleteAccountData(userId);
    return NextResponse.json({ received: true, deleted: report.accountRowDeleted, files: report.filesDeleted });
  } catch (e) {
    console.error(JSON.stringify({ event: "clerk_webhook_delete_failed", userId, error: String(e) }));
    return NextResponse.json({ error: "Deletion failed; please retry" }, { status: 500 });
  }
}
