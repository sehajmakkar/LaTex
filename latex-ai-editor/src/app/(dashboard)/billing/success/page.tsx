"use client";

import Link from "next/link";
import { FileCode2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useUser, SignOutButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export default function BillingSuccessPage() {
  const { user } = useUser();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex h-14 items-center justify-between border-b border-border bg-background/70 px-4 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
              <FileCode2 className="h-4 w-4 text-muted-foreground" />
            </div>
            <span className="font-display font-semibold">TeXel</span>
          </Link>
          <span className="text-sm text-muted-foreground">
            {user?.firstName ?? "User"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
          <SignOutButton>
            <Button variant="ghost" size="sm">
              Sign out
            </Button>
          </SignOutButton>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-6 w-6 text-green-600" />
              Thank you
            </CardTitle>
            <CardDescription>
              Your payment was successful. Your plan will be updated shortly. If
              you don’t see the change, refresh the dashboard or wait a few
              seconds for the webhook to sync.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <Link href="/dashboard">Back to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
