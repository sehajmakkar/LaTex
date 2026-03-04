"use client";

import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import Image from "next/image";
import { FileCode2, Target } from "lucide-react";
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
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-background p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary">
            <FileCode2 className="h-5 w-5 text-muted-foreground" />
          </div>
          <h1 className="font-display text-3xl font-bold">TeXel</h1>
        </div>
        <p className="max-w-md text-center text-muted-foreground text-lg text-balance leading-relaxed">
          Create developer resumes and documents with LaTeX. Edit with AI assistance,
          compile to PDF, and now score your resume with an ATS-style scan.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Button asChild size="lg" className="gap-2">
            <Link href="/sign-in">
              <Image
                src="/logo/google-icon-logo-svgrepo-com.svg"
                alt="Google"
                width={16}
                height={16}
                className="h-4 w-4"
              />
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
          Templates and projects require sign-in. You can create up to 3 projects for free.
        </p>
      </div>

      <div className="w-full max-w-3xl rounded-2xl border bg-card/60 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Target className="h-4 w-4" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium">Free ATS resume score</p>
              <p className="text-xs text-muted-foreground">
                Upload a resume, see a preview score, then sign in to unlock the full report.
              </p>
            </div>
          </div>
          <Button asChild size="sm" className="mt-1 w-full sm:mt-0 sm:w-auto">
            <Link href="/ats/free">Try a free ATS scan</Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
