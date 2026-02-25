"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { FileCode2, LayoutDashboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

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
      <div className="flex min-h-screen items-center justify-center bg-background">
        <p className="text-muted-foreground">Redirecting to dashboard...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 bg-background p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
          <FileCode2 className="h-5 w-5 text-muted-foreground" />
        </div>
        <h1 className="font-display text-3xl font-bold">LaTeX AI Editor</h1>
      </div>
      <p className="max-w-md text-center text-muted-foreground text-lg text-balance leading-relaxed">
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
      <p className="text-xs text-muted-foreground/70">
        Templates and projects require sign-in. You can create up to 3 projects for
        free.
      </p>
    </div>
  );
}
