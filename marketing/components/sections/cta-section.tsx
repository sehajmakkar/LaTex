import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { LiquidCtaButton } from "@/components/buttons/liquid-cta-button";
import { appLinks } from "@/lib/site";

export function CtaSection() {
  return (
    <section className="px-6 py-24">
      <div className="max-w-3xl mx-auto text-center">
        <h2 className="font-display text-4xl md:text-5xl font-bold text-zinc-100 mb-6">
          Ready to write a stronger resume?
        </h2>
        <p className="text-lg text-zinc-500 mb-10 text-balance">
          Join thousands of job seekers and researchers already using Vero to
          write, refine, and land faster.
        </p>
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
