import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
const cancelAll = vi.fn();
const deleteObjects = vi.fn();
vi.mock("@/lib/dodo", () => ({ cancelAllLiveDodoSubscriptions: (...a: unknown[]) => cancelAll(...a) }));
vi.mock("@/services/storage/r2", () => ({
  listResumeObjectKeys: async () => ["ats-resumes/u1/a.pdf"],
  deleteResumeObjects: (...a: unknown[]) => deleteObjects(...a),
}));
// Minimal drizzle stand-in: select(...).from(table).where(...) and delete(table).where(...).returning(...)
vi.mock("@/lib/db", () => {
  const rowsFor = (table: { _name?: string }) =>
    table._name === "users" ? [{ id: "u1", email: "a@b.c", dodoCustomerId: "cus_1" }] : table._name === "projects" ? [{ id: "p1" }] : [{ key: "ats-resumes/u1/a.pdf" }];
  return {
    db: {
      select: () => ({ from: (t: { _name?: string }) => ({ where: async () => rowsFor(t) }) }),
      delete: () => ({
        where: () => ({
          returning: async () => {
            calls.push("db.delete");
            return [{ id: "u1" }];
          },
        }),
      }),
    },
  };
});
vi.mock("@/lib/db/schema", () => ({
  users: { _name: "users", id: "id" },
  projects: { _name: "projects", id: "id", userId: "user_id" },
  atsReports: { _name: "ats_reports", userId: "user_id", resumeFileKey: "key" },
}));
vi.mock("drizzle-orm", () => ({ eq: () => ({}) }));

const { deleteAccountData } = await import("./account-deletion-service");

beforeEach(() => {
  calls.length = 0;
  cancelAll.mockReset().mockImplementation(async () => {
    calls.push("cancel");
    return ["sub_1"];
  });
  deleteObjects.mockReset().mockImplementation(async (keys: string[]) => {
    calls.push("r2.delete");
    return keys.length;
  });
});

describe("deleteAccountData", () => {
  it("cancels the subscription, then deletes files, then the account", async () => {
    const r = await deleteAccountData("u1");
    expect(calls).toEqual(["cancel", "r2.delete", "db.delete"]);
    expect(r).toEqual({ userId: "u1", subscriptionsCancelled: ["sub_1"], filesDeleted: 2, accountRowDeleted: true });
    // Thumbnails of the user's projects and the uploaded resume (deduplicated).
    expect(deleteObjects.mock.calls[0][0].sort()).toEqual(["ats-resumes/u1/a.pdf", "thumbnails/p1.webp"]);
  });

  it("if the subscription can't be cancelled, nothing is deleted (retry later)", async () => {
    cancelAll.mockRejectedValueOnce(new Error("Dodo down"));
    await expect(deleteAccountData("u1")).rejects.toThrow("Dodo down");
    expect(calls).toEqual([]);
  });

  it("if files can't be deleted, the account rows stay so a retry can find them", async () => {
    deleteObjects.mockRejectedValueOnce(new Error("R2 down"));
    await expect(deleteAccountData("u1")).rejects.toThrow("R2 down");
    expect(calls).toEqual(["cancel"]);
  });
});
