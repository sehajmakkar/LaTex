"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { SignedIn, SignedOut, UserButton, useAuth } from "@clerk/nextjs";
import { ArrowUpRight, CreditCard, FileText, LayoutTemplate, LifeBuoy, Menu, ScanSearch, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { VeroLogo } from "@/components/brand/VeroLogo";
import { PlanCard } from "@/components/shell/PlanCard";
import { cn } from "@/lib/utils";
import { site } from "@/lib/site";

type NavItem = {
  label: string;
  href: string;
  icon: typeof FileText;
  /** Other paths that should highlight this item. */
  match: (path: string) => boolean;
};

function navItems(signedIn: boolean): NavItem[] {
  const items: NavItem[] = [
    { label: "Resumes", href: "/dashboard", icon: FileText, match: (p) => p === "/dashboard" },
    { label: "Templates", href: "/templates", icon: LayoutTemplate, match: (p) => p.startsWith("/templates") },
    {
      label: "ATS check",
      href: signedIn ? "/ats" : "/ats/free",
      icon: ScanSearch,
      match: (p) => p.startsWith("/ats"),
    },
    { label: "Billing", href: "/billing", icon: CreditCard, match: (p) => p.startsWith("/billing") },
  ];
  return signedIn ? items : items.filter((i) => i.label === "Templates" || i.label === "ATS check");
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  return (
    <nav className="flex flex-col gap-0.5" aria-label="Main">
      {navItems(!!isSignedIn).map(({ label, href, icon: Icon, match }) => {
        const active = match(pathname);
        return (
          <Link
            key={label}
            href={href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition-colors",
              active
                ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent/60 hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <div className="flex flex-col gap-3">
      <SignedIn>
        <PlanCard onNavigate={onNavigate} />
      </SignedIn>
      <SignedOut>
        <div className="flex flex-col gap-2 rounded-xl border border-sidebar-border p-3">
          <p className="text-xs text-muted-foreground">Save resumes, use AI edits and keep ATS reports.</p>
          <Button size="sm" className="rounded-full" asChild>
            <Link href="/sign-up" onClick={onNavigate}>Create free account</Link>
          </Button>
          <Button size="sm" variant="ghost" className="rounded-full" asChild>
            <Link href="/sign-in" onClick={onNavigate}>Sign in</Link>
          </Button>
        </div>
      </SignedOut>

      <div className="flex flex-col gap-0.5 text-xs">
        <a
          href={site.marketingUrl}
          className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground"
        >
          <ArrowUpRight className="h-3.5 w-3.5" />
          Back to {site.name} site
        </a>
        {site.supportEmail && (
          <a
            href={`mailto:${site.supportEmail}`}
            className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-muted-foreground hover:text-foreground"
          >
            <LifeBuoy className="h-3.5 w-3.5" />
            Support
          </a>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-sidebar-border pt-3">
        <SignedIn>
          <UserButton showName appearance={{ elements: { avatarBox: "h-7 w-7", userButtonOuterIdentifier: "text-sm" } }} />
        </SignedIn>
        <SignedOut>
          <span />
        </SignedOut>
        <ThemeToggle />
      </div>
    </div>
  );
}

/**
 * Shared chrome for every app page except the editor: a sidebar on desktop and
 * a top bar with a slide-down menu on mobile. Works signed in and signed out
 * (templates and the free ATS check are public).
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const { isSignedIn } = useAuth();
  const home = isSignedIn ? "/dashboard" : "/templates";

  // Close the mobile menu whenever the route changes.
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setMenuOpen(false);
  }

  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <div className="flex min-h-dvh bg-background md:h-dvh">
      {/* Desktop sidebar */}
      <aside className="hidden w-60 shrink-0 flex-col justify-between border-r border-sidebar-border bg-sidebar px-3 py-4 md:flex">
        <div className="flex flex-col gap-6">
          <Link href={home} className="px-2.5" aria-label={`${site.name} home`}>
            <VeroLogo />
          </Link>
          <NavLinks />
        </div>
        <SidebarFooter />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md md:hidden">
          <Link href={home} aria-label={`${site.name} home`}>
            <VeroLogo />
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </header>
        {menuOpen && (
          <div className="fixed inset-x-0 bottom-0 top-14 z-20 flex flex-col justify-between overflow-y-auto bg-sidebar px-4 py-4 md:hidden">
            <NavLinks onNavigate={() => setMenuOpen(false)} />
            <SidebarFooter onNavigate={() => setMenuOpen(false)} />
          </div>
        )}

        <main className="min-w-0 flex-1 md:overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
