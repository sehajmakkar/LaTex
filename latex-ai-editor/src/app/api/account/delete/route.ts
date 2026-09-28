import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient, currentUser } from "@clerk/nextjs/server";
import { z } from "zod";
import { allowRequest } from "@/lib/rate-limit";
import { deleteAccountData } from "@/services/account-deletion-service";

const Body = z.object({ confirm: z.literal("DELETE") });
const error = (code: string, message: string, status: number) => NextResponse.json({ error: { code, message } }, { status });

/**
 * Deletes the signed-in user's account: our data first (subscription, files,
 * rows), then the Clerk login. If our part fails, the login stays so the user
 * can try again; the Clerk user.deleted webhook repeats the cleanup anyway.
 */
export async function POST(req: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("UNAUTHORIZED", "Sign in first.", 401);
  if (!Body.safeParse(await req.json().catch(() => null)).success) return error("CONFIRMATION_REQUIRED", 'Type "DELETE" to confirm.', 400);
  if (!allowRequest(`account-delete:${userId}`, 3)) return error("RATE_LIMITED", "Too many attempts. Wait a minute.", 429);

  const email = (await currentUser())?.emailAddresses?.[0]?.emailAddress ?? null;
  try {
    await deleteAccountData(userId, email);
  } catch (e) {
    console.error(JSON.stringify({ event: "account_delete_failed", userId, error: String(e) }));
    return error(
      "DELETE_FAILED",
      "We couldn't delete your account right now (your subscription or files couldn't be removed). Nothing was lost; please try again in a few minutes.",
      502
    );
  }
  try {
    await (await clerkClient()).users.deleteUser(userId);
  } catch (e) {
    // Our data is gone; the login remains. The user can try again or contact support.
    console.error(JSON.stringify({ event: "account_delete_clerk_failed", userId, error: String(e) }));
    return error("LOGIN_DELETE_FAILED", "Your data was deleted, but we couldn't remove your login. Please try again.", 502);
  }
  return NextResponse.json({ data: { deleted: true } });
}
