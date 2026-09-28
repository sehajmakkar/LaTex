import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { atsReports, projects, users } from "@/lib/db/schema";
import { cancelAllLiveDodoSubscriptions } from "@/lib/dodo";
import { deleteResumeObjects, listResumeObjectKeys } from "@/services/storage/r2";

export type DeletionReport = {
  userId: string;
  subscriptionsCancelled: string[];
  filesDeleted: number;
  accountRowDeleted: boolean;
};

/** R2 keys that belong to a user: ATS uploads (by prefix and by record) and dashboard thumbnails. */
async function userFileKeys(userId: string): Promise<string[]> {
  const [projectRows, reportRows, prefixed] = await Promise.all([
    db.select({ id: projects.id }).from(projects).where(eq(projects.userId, userId)),
    db.select({ key: atsReports.resumeFileKey }).from(atsReports).where(eq(atsReports.userId, userId)),
    listResumeObjectKeys(`ats-resumes/${userId}/`),
  ]);
  return [
    ...new Set([
      ...prefixed,
      ...reportRows.map((r) => r.key).filter((k): k is string => !!k),
      ...projectRows.map((p) => `thumbnails/${p.id}.webp`),
    ]),
  ];
}

/**
 * Deletes everything we hold for a user, in an order that's safe to retry:
 *   1. cancel any live Dodo subscription (a failure stops here: a deleted
 *      account must never be charged again);
 *   2. delete their R2 files (uploaded resumes, thumbnails);
 *   3. delete the user row, which cascades to projects, usage, AI chats,
 *      versions and ATS reports.
 * Running it again after a partial failure finishes the job; running it for
 * an account that's already gone is a no-op.
 */
export async function deleteAccountData(userId: string, email?: string | null): Promise<DeletionReport> {
  const user = (await db.select().from(users).where(eq(users.id, userId)))[0];

  const subscriptionsCancelled = await cancelAllLiveDodoSubscriptions({
    clerkUserId: userId,
    dodoCustomerId: user?.dodoCustomerId ?? null,
    email: user?.email || email || "",
  });

  const keys = await userFileKeys(userId);
  const filesDeleted = await deleteResumeObjects(keys);

  const deleted = await db.delete(users).where(eq(users.id, userId)).returning({ id: users.id });

  const report: DeletionReport = { userId, subscriptionsCancelled, filesDeleted, accountRowDeleted: deleted.length > 0 };
  console.log(JSON.stringify({ event: "account_deleted", ...report }));
  return report;
}
