import { pricing } from "@/lib/site"

export const faqs = [
  {
    q: "What is Vero?",
    a: "Vero is an AI-native resume builder built on LaTeX. You get professional templates, a live PDF preview, inline AI editing and a free ATS check in one workspace.",
  },
  {
    q: "Do I need to know LaTeX?",
    a: "No. Start from a template and edit the text you see, or select a line and press ⌘K to describe the change in plain English. If you do know LaTeX, the full source is yours to edit.",
  },
  {
    q: "Is the ATS check really free?",
    a: "Yes, on every plan. Upload a PDF or DOCX, or check a resume you wrote in Vero, and paste a job description to see which keywords you cover.",
  },
  {
    q: "What's the difference between Free and Pro?",
    a: `Free includes ${pricing.free.resumes} resumes, every template, ${pricing.free.aiEditsPerMonth} AI edits a month, the ATS check and PDF download. Pro (${pricing.pro.price}/month, tax included) adds unlimited resumes, ${pricing.pro.aiEditsPerMonth.toLocaleString("en-US")} AI edits a month and new AI features first.`,
  },
  {
    q: "Will the AI make things up on my resume?",
    a: "No. The AI is instructed and checked never to add numbers, employers, dates or tools you didn't give it. If you ask for a metric it doesn't know, it leaves a placeholder like [X] for you to fill in.",
  },
  {
    q: "Can I download my resume as a PDF?",
    a: "Yes. Compile and download a pixel-perfect PDF on every plan.",
  },
  {
    q: "Can I cancel Pro anytime?",
    a: "Yes. Pro renews monthly and you can cancel whenever you like. Your resumes stay in your account on the Free plan.",
  },
  {
    q: "Is my resume private?",
    a: "Your resumes are stored in your account and never published or shared. When you use an AI feature, only the relevant text is sent to our AI provider to produce that edit.",
  },
]

export function FaqSection() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  }

  return (
    <section id="faq" className="px-6 py-24">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">FAQ</p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-zinc-100 mb-4">Questions, answered</h2>
          <p className="text-zinc-500 max-w-xl mx-auto text-balance text-lg">
            Everything you need to know before you start.
          </p>
        </div>

        <div className="divide-y divide-zinc-800/70 rounded-2xl border border-zinc-800/50 bg-zinc-900/50">
          {faqs.map(({ q, a }) => (
            <details key={q} className="group px-6 py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-heading font-medium text-zinc-100 [&::-webkit-details-marker]:hidden">
                {q}
                <span aria-hidden className="text-xl leading-none text-zinc-500 transition-transform duration-200 group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-zinc-500">{a}</p>
            </details>
          ))}
        </div>
      </div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
    </section>
  )
}
