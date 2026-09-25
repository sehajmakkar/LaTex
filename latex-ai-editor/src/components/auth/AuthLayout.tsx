import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { VeroLogo } from "@/components/brand/VeroLogo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { site } from "@/lib/site";

const POINTS = [
  "Professional LaTeX resume templates, compiled to PDF in seconds",
  "AI edits with ⌘K: select a line, say what to change",
  "Free ATS check to see how hiring software reads you",
];

/** Split layout for sign-in/up: product promise on the left, Clerk on the right. */
export function AuthLayout({ children, heading }: { children: React.ReactNode; heading: string }) {
  return (
    <div className="grid min-h-dvh bg-background lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <aside className="hidden flex-col justify-between border-r border-sidebar-border bg-sidebar p-10 lg:flex">
        <Link href="/templates" aria-label={`${site.name} templates`}>
          <VeroLogo />
        </Link>
        <div className="max-w-md">
          <h2 className="font-display text-3xl leading-tight tracking-tight">{site.tagline}</h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((point) => (
              <li key={point} className="flex gap-3 text-sm text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-foreground" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <a href={site.marketingUrl} className="flex w-fit items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowUpRight className="h-4 w-4" />
          Back to {site.name} site
        </a>
      </aside>

      <main className="flex flex-col">
        <div className="flex h-14 items-center justify-between px-4 lg:justify-end">
          <Link href="/templates" className="lg:hidden" aria-label={`${site.name} templates`}>
            <VeroLogo />
          </Link>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-16">
          <h1 className="sr-only">{heading}</h1>
          {children}
        </div>
      </main>
    </div>
  );
}
