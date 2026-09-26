import { Check } from "lucide-react";
import Link from "next/link";
import { appLinks, pricing } from "@/lib/site";

// Mirrors the dashboard's billing page (latex-ai-editor/src/app/(app)/billing).
const plans = [
  {
    name: "Free",
    description: "Build and check a resume properly, for free.",
    price: "$0",
    period: "forever",
    features: [
      `${pricing.free.resumes} resumes, every template`,
      "LaTeX editor with live PDF preview",
      `${pricing.free.aiEditsPerMonth} AI edits and ${pricing.free.aiCommandsPerMonth} AI commands a month`,
      "ATS check",
      "PDF download",
    ],
    cta: "Start Writing Free",
    href: appLinks.start,
    highlighted: false,
  },
  {
    name: "Pro",
    description: "For an active job search: unlimited resumes and far more AI.",
    price: pricing.pro.price,
    period: "/month",
    features: [
      "Unlimited resumes",
      `${pricing.pro.aiEditsPerMonth.toLocaleString("en-US")} AI edits and ${pricing.pro.aiCommandsPerMonth} AI commands a month`,
      "Everything in Free",
      "Longer version history, new AI features first",
      "Cancel anytime",
    ],
    cta: "Upgrade to Pro",
    href: appLinks.pro,
    highlighted: true,
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="px-6 py-24">
      <div className="max-w-5xl mx-auto">
        {/* Section Header */}
        <div className="text-center mb-16">
          <p className="text-sm font-medium text-zinc-500 uppercase tracking-wider mb-4">
            Pricing
          </p>
          <h2 className="font-display text-4xl md:text-5xl font-bold text-zinc-100 mb-4">
            Simple, transparent pricing
          </h2>
          <p className="text-zinc-500 max-w-xl mx-auto text-balance text-lg">
            Start free. Upgrade when you need unlimited resumes and more AI edits.
          </p>
        </div>

        {/* Pricing Grid */}
        <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`p-8 rounded-2xl border flex flex-col h-full ${
                plan.highlighted
                  ? "bg-zinc-100 border-zinc-100"
                  : "bg-zinc-900/50 border-zinc-800/50"
              }`}
            >
              {/* Plan Header */}
              <div className="mb-6">
                <h3
                  className={`font-heading text-xl font-semibold mb-2 ${
                    plan.highlighted ? "text-zinc-900" : "text-zinc-100"
                  }`}
                >
                  {plan.name}
                </h3>
                <p
                  className={`text-sm ${plan.highlighted ? "text-zinc-600" : "text-zinc-500"}`}
                >
                  {plan.description}
                </p>
              </div>

              {/* Price */}
              <div className="mb-6">
                <span
                  className={`font-display text-4xl font-bold ${plan.highlighted ? "text-zinc-900" : "text-zinc-100"}`}
                >
                  {plan.price}
                </span>
                <span
                  className={`text-sm ${plan.highlighted ? "text-zinc-600" : "text-zinc-500"}`}
                >
                  {plan.period}
                </span>
              </div>

              {/* Features */}
              <ul className="space-y-3 mb-8 flex-1">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-3">
                    <Check
                      className={`w-5 h-5 shrink-0 ${plan.highlighted ? "text-zinc-900" : "text-zinc-400"}`}
                    />
                    <span
                      className={`text-sm ${plan.highlighted ? "text-zinc-700" : "text-zinc-400"}`}
                    >
                      {feature}
                    </span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <Link
                href={plan.href}
                className={`block w-full py-3 px-6 text-center rounded-full font-medium text-sm transition-colors mt-auto ${
                  plan.highlighted
                    ? "bg-zinc-900 text-zinc-100 hover:bg-zinc-800"
                    : "bg-zinc-800 text-zinc-100 hover:bg-zinc-700"
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-sm text-zinc-600">
          Prices in USD, tax included. Payments are handled securely by Dodo Payments.
        </p>
      </div>
    </section>
  );
}
