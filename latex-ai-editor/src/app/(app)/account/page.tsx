"use client";

import { useState } from "react";
import Link from "next/link";
import { useClerk, useUser } from "@clerk/nextjs";
import { toast } from "sonner";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Page, PageHeader } from "@/components/shell/Page";
import { useUsage } from "@/hooks/use-usage";
import { site } from "@/lib/site";

export default function AccountPage() {
  const { user } = useUser();
  const { signOut, openUserProfile } = useClerk();
  const { data: usage } = useUsage();
  const [open, setOpen] = useState(false);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const isPro = usage?.plan === "pro";

  const deleteAccount = async () => {
    if (confirm !== "DELETE") return;
    setDeleting(true);
    try {
      const res = await fetch("/api/account/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm }),
      });
      const body = await res.json().catch(() => null);
      if (!res.ok) throw new Error(body?.error?.message ?? "Couldn't delete your account.");
      toast.success("Your account was deleted.");
      await signOut({ redirectUrl: site.marketingUrl });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Couldn't delete your account.");
      setDeleting(false);
    }
  };

  return (
    <Page className="max-w-3xl">
      <PageHeader title="Account" description="Your sign-in details, and deleting your account." />

      <section className="rounded-2xl border bg-card p-5">
        <h2 className="font-heading text-base font-semibold">Profile</h2>
        <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-[120px_1fr]">
          <dt className="text-muted-foreground">Name</dt>
          <dd>{user?.fullName || "–"}</dd>
          <dt className="text-muted-foreground">Email</dt>
          <dd className="break-all">{user?.primaryEmailAddress?.emailAddress || "–"}</dd>
          <dt className="text-muted-foreground">Plan</dt>
          <dd>
            {isPro ? "Pro" : "Free"} ·{" "}
            <Link href="/billing" className="underline underline-offset-4">
              Billing
            </Link>
          </dd>
        </dl>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => openUserProfile()}>
          Manage sign-in and security
        </Button>
      </section>

      <section className="mt-6 rounded-2xl border border-destructive/40 p-5">
        <h2 className="flex items-center gap-2 font-heading text-base font-semibold text-destructive">
          <AlertTriangle className="h-4 w-4" /> Delete account
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Permanently deletes your resumes, versions, AI chats, ATS reports, uploaded files and your login.
          {isPro ? " Your Pro subscription is cancelled right away, so you won't be charged again." : ""} This can&apos;t be undone.
        </p>
        <Button variant="destructive" size="sm" className="mt-4" onClick={() => setOpen(true)}>
          <Trash2 className="h-4 w-4" /> Delete my account
        </Button>
      </section>

      <Dialog open={open} onOpenChange={(o) => !deleting && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              Everything is removed permanently: resumes, versions, AI chats, ATS reports and uploaded files.
              {isPro ? " Your Pro subscription is cancelled now (no further charges)." : ""} Download any PDFs you want to keep first.
            </DialogDescription>
          </DialogHeader>
          <label htmlFor="confirm-delete" className="text-sm">
            Type <span className="font-mono font-semibold">DELETE</span> to confirm
          </label>
          <input
            id="confirm-delete"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="off"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/50"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={deleteAccount} disabled={confirm !== "DELETE" || deleting}>
              {deleting && <Loader2 className="h-4 w-4 animate-spin" />}
              Delete account
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
