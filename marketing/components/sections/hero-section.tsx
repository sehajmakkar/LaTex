"use client";

import { useRef } from "react";
import Link from "next/link";
import { LiquidCtaButton } from "@/components/buttons/liquid-cta-button";
import { ArrowRight } from "lucide-react";
import { appLinks } from "@/lib/site";
import { LatexFluid } from "@/components/ui/latex-fluid";
import { AvatarStack } from "@/components/ui/avatar-stack";
import { LatexLogo } from "@/components/brand/latex-logo";

// Illustrated faces ("Notionists" by Zoish, CC0 1.0), not real users.
const FACES = ["/avatars/aria.svg", "/avatars/kiran.svg", "/avatars/noah.svg", "/avatars/zara.svg", "/avatars/leo.svg"];

export function HeroSection() {
  const copyRef = useRef<HTMLDivElement>(null);

  return (
    <section className="min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-40 md:pb-44 relative">
      {/* Background gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-b from-zinc-900/50 via-transparent to-transparent" />

      {/* LaTeX characters the pointer stirs like ink, wrapped around the copy like a U */}
      <LatexFluid clearRef={copyRef} />

      {/* Content */}
      <div ref={copyRef} className="relative z-10 text-center max-w-3xl mx-auto">
        {/* Badge */}
        {/* <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900/80 border border-zinc-800 mb-8">
          <Sparkles className="w-4 h-4 text-zinc-400" />
          <span className="text-sm text-zinc-400">
            Cursor for LaTeX & Resumes
          </span>
        </div> */}

        {/* <AvatarStack faces={FACES} more={10} className="mx-auto mb-6" /> */}

        {/* Headline */}
        <h1 className="font-display font-bold tracking-tight mb-6">
          <span className="text-zinc-100 text-5xl md:text-7xl block">
            Cursor for <LatexLogo className="ml-[0.08em]" />
          </span>
          <span className="bg-gradient-to-r text-3xl md:text-5xl from-zinc-500 via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
            Write smarter, Land faster.
          </span>
        </h1>

        {/* Subheadline */}
        <p className="text-lg md:text-xl text-zinc-500 max-w-2xl mx-auto mb-10 leading-relaxed text-balance">
          The AI-native writing workspace for resumes and technical documents.
          Ask for changes like you would in ChatGPT, rewrite any line inline,
          start from pro templates and check your ATS score, all in one place.
        </p>

        {/* CTAs */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link href={appLinks.start}>
            <LiquidCtaButton>Start Writing Free</LiquidCtaButton>
          </Link>
          <Link
            href="#features"
            className="group flex items-center gap-2 px-6 py-3 text-sm font-medium text-zinc-400 hover:text-zinc-100 transition-colors"
          >
            <span>See how it works</span>
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300" />
          </Link>
        </div>
      </div>
    </section>
  );
}
