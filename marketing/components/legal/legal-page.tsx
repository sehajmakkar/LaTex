import Link from "next/link"
import { Navbar } from "@/components/ui/navbar"
import { FooterSection } from "@/components/sections/footer-section"
import { CONTACT_EMAIL, legal } from "@/lib/site"

const LEGAL_PAGES = [
  { href: "/terms", label: "Terms of Service" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/refunds", label: "Refund Policy" },
]

/** Shared layout for the Terms, Privacy and Refund pages. */
export function LegalPage({ title, current, intro, children }: { title: string; current: string; intro: React.ReactNode; children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-zinc-950">
      <Navbar />
      <div className="mx-auto max-w-3xl px-6 pb-24 pt-36">
        <nav aria-label="Legal pages" className="mb-10 flex flex-wrap gap-2">
          {LEGAL_PAGES.map((page) => (
            <Link
              key={page.href}
              href={page.href}
              aria-current={page.href === current ? "page" : undefined}
              className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                page.href === current ? "border-zinc-500 text-zinc-100" : "border-zinc-800 text-zinc-500 hover:text-zinc-200"
              }`}
            >
              {page.label}
            </Link>
          ))}
        </nav>
        <h1 className="font-display text-4xl tracking-tight text-zinc-100 md:text-5xl">{title}</h1>
        <p className="mt-3 text-sm text-zinc-500">Effective {legal.effectiveDate}</p>
        <div className="mt-8 text-base leading-relaxed text-zinc-300">{intro}</div>
        <div
          className="mt-4 text-[15px] leading-relaxed text-zinc-400
            [&_a]:text-zinc-200 [&_a]:underline [&_a]:underline-offset-2 hover:[&_a]:text-white
            [&_h2]:mt-12 [&_h2]:scroll-mt-28 [&_h2]:font-heading [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-zinc-100
            [&_h3]:mt-6 [&_h3]:font-heading [&_h3]:font-semibold [&_h3]:text-zinc-200
            [&_li]:mt-2 [&_p]:mt-4 [&_strong]:font-semibold [&_strong]:text-zinc-200
            [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5"
        >
          {children}
        </div>
      </div>
      <FooterSection />
    </main>
  )
}

/** "Contact" block used at the end of each legal page. */
export function ContactBlock() {
  return (
    <p>
      Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>, or message{" "}
      <a href={legal.x.url} target="_blank" rel="noreferrer">
        {legal.x.handle}
      </a>{" "}
      on X. For privacy and refund requests, email is best: write from the address on your Vero account so we can confirm it&apos;s
      you. We aim to reply within 7 days.
    </p>
  )
}
