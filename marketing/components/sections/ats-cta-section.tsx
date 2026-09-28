import Link from "next/link"
import { LiquidCtaButton } from "@/components/buttons/liquid-cta-button"
import { ScanChecklist } from "@/components/motion/scan-checklist"
import { appLinks } from "@/lib/site"

const checks = [
  "What an ATS reads: contact details, sections, dates, titles",
  "Keyword match against the job you paste in",
  "Formatting that gets resumes filtered out",
  "Suggestions to strengthen weak bullets",
]

/** Free ATS check call-to-action. Sign-up first, then the dashboard's ATS page. */
export function AtsCtaSection() {
  return (
    <section id="ats-check" className="px-6 py-24">
      <div className="max-w-5xl mx-auto grid gap-10 rounded-3xl border border-zinc-800/60 bg-gradient-to-b from-zinc-900/70 to-zinc-950 p-8 md:grid-cols-[1.1fr_1fr] md:p-12">
        <div>
          <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">Free ATS resume check</p>
          <h2 className="font-display text-3xl md:text-4xl font-bold text-zinc-100 mb-4">
            Will the ATS read your resume? Find out free.
          </h2>
          <div className="mt-8">
            <Link href={appLinks.ats}>
              <LiquidCtaButton>Check My Resume Free</LiquidCtaButton>
            </Link>
          </div>
        </div>
        <div className="flex items-center">
          <ScanChecklist items={checks} />
        </div>
      </div>
    </section>
  )
}
