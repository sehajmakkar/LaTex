import Link from "next/link";
import { Twitter, Linkedin } from "lucide-react";
import { VeroWordmark } from "@/components/brand/vero-logo";
import { CONTACT_EMAIL, appLinks, legal } from "@/lib/site";

export function UsefulShelfBadge() {
  return (
    <a
      href="https://usefulshelf.co/?utm_source=withvero.app&amp;utm_medium=referral&amp;utm_campaign=badge&amp;utm_content=light"
      target="_blank"
      rel="noopener"
      className="inline-block opacity-80 transition-opacity hover:opacity-100"
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- external badge SVG, sized by its host */}
      <img
        src="https://usefulshelf.co/badge/usefulshelf.svg"
        alt="Featured on UsefulShelf"
        width={220}
        height={59}
        loading="lazy"
        decoding="async"
        style={{
          display: "inline-block",
          border: 0,
          width: "100%",
          maxWidth: 220,
          height: "auto",
          maxHeight: 59,
        }}
      />
    </a>
  );
}

const footerLinks = {
  product: [
    { label: "Features", href: "/#features" },
    { label: "Templates", href: appLinks.templates },
    { label: "Free ATS check", href: appLinks.ats },
    { label: "Pricing", href: "/#pricing" },
    { label: "FAQ", href: "/#faq" },
  ],
  company: [
    { label: "Log in", href: appLinks.signIn },
    { label: "Contact", href: `mailto:${CONTACT_EMAIL}` },
    { label: "X (Twitter)", href: legal.x.url },
  ],
  legal: [
    { label: "Terms of Service", href: "/terms" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Refund Policy", href: "/refunds" },
    { label: "Security", href: "/privacy#security" },
  ],
};

export function FooterSection() {
  return (
    <footer className="px-6 py-16 border-t border-zinc-900">
      <div className="max-w-5xl mx-auto">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              aria-label="Vero home"
              className="inline-flex text-zinc-100"
            >
              <VeroWordmark height={22} />
            </Link>
            <p className="mt-4 text-sm text-zinc-500 max-w-xs">
              The AI-native writing workspace for LaTeX, resumes, and technical
              documents.
            </p>
            {/* Launch-platform badge (also a backlink they ask for) */}
            <a
              href="https://codehype.ai/product/vero?utm_source=codehype_badge"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-block opacity-80 transition-opacity hover:opacity-100"
            >
              {/* eslint-disable-next-line @next/next/no-img-element -- external badge SVG, sized by its host */}
              <img
                src="https://codehype.ai/badges/vero.svg?variant=find-us&v=20"
                alt="Featured on CodeHype"
                width={160}
                height={58}
                loading="lazy"
                decoding="async"
                style={{
                  display: "inline-block",
                  border: 0,
                  width: "100%",
                  maxWidth: 160,
                  height: "auto",
                  maxHeight: 58,
                }}
              />
            </a>
            <div className="mt-3">
              <UsefulShelfBadge />
            </div>
          </div>

          {/* Product Links */}
          <div>
            <h4 className="font-heading text-sm font-semibold text-zinc-100 mb-4">
              Product
            </h4>
            <ul className="space-y-3">
              {footerLinks.product.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company Links */}
          <div>
            <h4 className="font-heading text-sm font-semibold text-zinc-100 mb-4">
              Company
            </h4>
            <ul className="space-y-3">
              {footerLinks.company.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h4 className="font-heading text-sm font-semibold text-zinc-100 mb-4">
              Legal
            </h4>
            <ul className="space-y-3">
              {footerLinks.legal.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-zinc-900 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-zinc-600">
            © {new Date().getFullYear()} Vero. All rights reserved.
          </p>
          <div className="flex items-center gap-4">
            <a
              href={legal.x.url}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label="Vero on X"
            >
              <Twitter className="w-5 h-5" />
            </a>
            <a
              href={legal.linkedin}
              target="_blank"
              rel="noreferrer"
              className="text-zinc-500 hover:text-zinc-300 transition-colors"
              aria-label="LinkedIn"
            >
              <Linkedin className="w-5 h-5" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
