import Link from "next/link"
import { Check } from "lucide-react"
import { LiquidCtaButton } from "@/components/buttons/liquid-cta-button"
import { appLinks } from "@/lib/site"

const checks = [
  "What an ATS actually reads: contact details, sections, dates and job titles",
  "Keyword match against the job description you paste in",
  "Formatting problems that get resumes filtered out",
  "AI suggestions to strengthen weak bullet points",
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
          <p className="text-zinc-500 text-balance">
            Most companies screen applications with an applicant tracking system before a person sees them. Upload your
            resume as a PDF or DOCX and see exactly what gets through, and what to fix.
          </p>
          <div className="mt-8">
            <Link href={appLinks.ats}>
              <LiquidCtaButton>Check My Resume Free</LiquidCtaButton>
            </Link>
          </div>
        </div>
        <ul className="flex flex-col justify-center gap-4">
          {checks.map((item) => (
            <li key={item} className="flex gap-3 text-sm text-zinc-400">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-zinc-300" />
              {item}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
