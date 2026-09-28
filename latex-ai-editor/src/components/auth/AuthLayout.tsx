import Link from "next/link";
import { ArrowUpRight, Check } from "lucide-react";
import { VeroLogo } from "@/components/brand/VeroLogo";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { site } from "@/lib/site";
import { ResumeFolder } from "@/components/auth/ResumeFolder";

const POINTS = [
  "Ask for any change like in ChatGPT, and review it as a diff",
  "Proven LaTeX templates, or import the resume you have",
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
        <div className="flex justify-center py-6">
          <ResumeFolder />
        </div>
        <div className="max-w-md">
          <h2 className="font-display text-3xl leading-tight tracking-tight">{site.tagline}</h2>
          <ul className="mt-6 space-y-3">
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
          <p className="max-w-sm text-center text-xs text-muted-foreground">
            By continuing, you agree to Vero&apos;s{" "}
            <a href={`${site.marketingUrl}${site.legal.terms}`} className="underline underline-offset-2 hover:text-foreground">
              Terms of Service
            </a>{" "}
            and{" "}
            <a href={`${site.marketingUrl}${site.legal.privacy}`} className="underline underline-offset-2 hover:text-foreground">
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </main>
    </div>
  );
}
