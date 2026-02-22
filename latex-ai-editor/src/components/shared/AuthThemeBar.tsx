"use client";

import Link from "next/link";
import { FileCode2 } from "lucide-react";
import { ThemeToggle } from "@/components/shared/ThemeToggle";

export function AuthThemeBar() {
  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <Link href="/" className="flex items-center gap-2">
        <FileCode2 className="h-5 w-5 text-primary" />
        <span className="font-semibold">LaTeX AI Editor</span>
      </Link>
      <ThemeToggle />
    </header>
  );
}
