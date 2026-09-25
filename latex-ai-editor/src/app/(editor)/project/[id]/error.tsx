"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

type ErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProjectError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error("Project error:", error);
  }, [error]);

  return (
    <div className="flex h-dvh flex-col items-center justify-center gap-4 px-4 text-center">
      <AlertTriangle className="h-10 w-10 text-destructive" />
      <h2 className="font-heading text-lg font-semibold">The editor hit an error</h2>
      <p className="max-w-sm text-sm text-muted-foreground">Your last autosave is safe. Reload the editor or go back to your resumes.</p>
      <div className="flex gap-2">
        <Button onClick={reset}>Reload editor</Button>
        <Button variant="outline" asChild>
          <Link href="/dashboard">Your resumes</Link>
        </Button>
      </div>
    </div>
  );
}
