import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VeroLogo } from "@/components/brand/VeroLogo";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-background px-4 text-center">
      <VeroLogo />
      <div>
        <p className="font-display text-6xl tracking-tight">404</p>
        <h1 className="mt-3 font-heading text-lg font-semibold">This page doesn&apos;t exist</h1>
        <p className="mt-1 text-sm text-muted-foreground">The link may be old, or the resume may have been deleted.</p>
      </div>
      <div className="flex gap-2">
        <Button asChild>
          <Link href="/dashboard">Your resumes</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="/templates">Templates</Link>
        </Button>
      </div>
    </div>
  );
}
