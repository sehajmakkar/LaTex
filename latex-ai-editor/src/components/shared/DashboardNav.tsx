"use client";

import Link from "next/link";
import { FileCode2 } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

type DashboardNavProps = {
  /** Left side content. Defaults to logo linking to dashboard. */
  leftContent?: React.ReactNode;
  /** Nav links/buttons before ThemeToggle and UserButton. */
  rightContent?: React.ReactNode;
};

const defaultLeft = (
  <Link href="/dashboard" className="flex items-center gap-2">
    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-secondary">
      <FileCode2 className="h-4 w-4 text-muted-foreground" />
    </div>
    <span className="font-display font-semibold">TeXel</span>
  </Link>
);

export function DashboardNav({
  leftContent,
  rightContent,
}: DashboardNavProps) {
  return (
    <header className="flex h-14 items-center justify-between border-b border-border bg-background/70 px-4 backdrop-blur-md">
      <div className="flex min-w-0 items-center gap-4">
        {leftContent ?? defaultLeft}
      </div>
      <div className="flex items-center gap-2">
        {rightContent}
        <ThemeToggle />
        <UserButton
          afterSignOutUrl="/"
          appearance={{
            elements: { avatarBox: "h-8 w-8" },
          }}
        />
      </div>
    </header>
  );
}
