"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FileCode2, FileText, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.replace("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  if (isLoaded && isSignedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-6">
      <div className="flex items-center gap-2">
        <FileCode2 className="h-8 w-8 text-primary" />
        <h1 className="text-2xl font-bold">LaTeX AI Editor</h1>
      </div>
      <p className="max-w-md text-center text-muted-foreground">
        Create developer resumes and documents with LaTeX. Edit with AI assistance
        and compile to PDF. Sign in with Google to get started.
      </p>
      <div className="flex flex-col gap-4 sm:flex-row">
        <Button asChild size="lg" className="gap-2">
          <Link href="/sign-in">
            <LayoutDashboard className="h-4 w-4" />
            Sign in with Google
          </Link>
        </Button>
        <Button asChild variant="outline" size="lg" className="gap-2">
          <Link href="/templates">
            <FileCode2 className="h-4 w-4" />
            Resume templates
          </Link>
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Templates and projects require sign-in. You can create up to 3 projects for
        free.
      </p>
    </div>
  );
}
