import type { Metadata } from "next"
import Link from "next/link"
import { ContactBlock, LegalPage } from "@/components/legal/legal-page"
import { APP_URL, CONTACT_EMAIL, legal, pricing } from "@/lib/site"

export const metadata: Metadata = {
  title: "Refund Policy",
  description: `Vero Pro: cancel anytime, and a full refund of your first payment within ${legal.refundWindowDays} days.`,
  alternates: { canonical: "/refunds" },
}

export default function RefundsPage() {
  const days = legal.refundWindowDays
  return (
    <LegalPage
      title="Refund Policy"
      current="/refunds"
      intro={
        <p>
          Vero has a free plan so you can try everything before paying. If you upgrade to Pro ({pricing.pro.price}/month) and it isn&apos;t
          right for you, here&apos;s how refunds and cancellation work.
        </p>
      }
    >
      <h2 id="first-payment">{days}-day refund on your first payment</h2>
      <p>
        If you ask within <strong>{days} days</strong> of your first Pro payment, we&apos;ll refund it in full, no questions asked. This
        applies once per account, to the first time you subscribe. When we refund it, your subscription is cancelled and your account moves
        to the Free plan straight away. Your resumes stay in your account.
      </p>

      <h2 id="renewals">Monthly renewals</h2>
      <p>
        Pro renews every month until you cancel. Renewal payments aren&apos;t refunded, including for partly used months, but you can{" "}
        <strong>cancel anytime</strong> from the <a href={`${APP_URL}/billing`}>Billing</a> page: you keep Pro until the end of the
        month you&apos;ve paid for and won&apos;t be charged again. Cancel before your renewal date to avoid the next charge.
      </p>

      <h2 id="errors">Charges made in error</h2>
      <p>We&apos;ll always refund in full, whenever you notice:</p>
      <ul>
        <li>duplicate charges for the same period;</li>
        <li>a charge after you cancelled, or after you deleted your account;</li>
        <li>any other charge caused by a mistake on our side.</li>
      </ul>
      <p>
        If a serious problem on our side stops you from using Pro for a long stretch and we can&apos;t fix it, contact us and we&apos;ll
        work out a fair refund or credit.
      </p>

      <h2 id="how">How to request a refund</h2>
      <p>
        Email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from the address on your Vero account (or include it), with the
        date of the payment. You can also message{" "}
        <a href={legal.x.url} target="_blank" rel="noreferrer">
          {legal.x.handle}
        </a>{" "}
        on X, but we&apos;ll still need to confirm your account by email. We reply within 3 business days.
      </p>

      <h2 id="processing">How refunds are paid</h2>
      <p>
        Payments for Vero are processed by Dodo Payments, our merchant of record, so refunds are issued through Dodo Payments to the
        payment method you used, for the full amount you paid, including taxes. Refunds usually appear within 5 to 10 business days,
        depending on your bank or card provider.
      </p>
      <p>
        If you think a charge is wrong, please contact us before disputing it with your bank; we can usually sort it out faster.
      </p>

      <h2 id="contact">Contact</h2>
      <ContactBlock />
      <p>
        See also our <Link href="/terms">Terms of Service</Link> and <Link href="/privacy">Privacy Policy</Link>.
      </p>
    </LegalPage>
  )
}
