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
import { DashboardNav } from "@/components/shared/DashboardNav";

export default function BillingSuccessPage() {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <DashboardNav
        rightContent={
          <Button variant="outline" size="sm" asChild>
            <Link href="/dashboard">Dashboard</Link>
          </Button>
        }
      />

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
