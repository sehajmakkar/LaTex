import type { Metadata } from "next"
import Link from "next/link"
import { ContactBlock, LegalPage } from "@/components/legal/legal-page"
import { APP_URL, legal, pricing } from "@/lib/site"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "The terms for using Vero, the AI-native LaTeX resume editor.",
  alternates: { canonical: "/terms" },
}

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Service"
      current="/terms"
      intro={
        <p>
          These terms are an agreement between you and {legal.operator}, an individual based in {legal.location}, who operates Vero
          (&quot;Vero&quot;, &quot;we&quot;, &quot;us&quot;). They cover the website at withvero.app, the app at dashboard.withvero.app and
          everything you do with them. By creating an account or using Vero, you agree to these terms. If you don&apos;t agree, please
          don&apos;t use Vero.
        </p>
      }
    >
      <h2 id="service">1. What Vero is</h2>
      <p>
        Vero is an online editor for writing resumes and other documents in LaTeX. It includes a live PDF preview, resume templates, AI
        editing features, resume import, and an ATS check that estimates how applicant tracking systems read your resume. Vero is in
        active development: we add, change and sometimes remove features, and we&apos;ll tell you in advance if a change takes away
        something you pay for.
      </p>

      <h2 id="eligibility">2. Who can use Vero</h2>
      <ul>
        <li>You must be at least 13 years old.</li>
        <li>
          If you&apos;re under 18, you may use Vero only with the permission of a parent or legal guardian, who agrees to these terms
          on your behalf and is responsible for your use of Vero.
        </li>
        <li>Paid plans must be bought by someone aged 18 or over (for example, a parent or guardian for a student under 18).</li>
        <li>You may not use Vero if you&apos;re barred from doing so under the laws that apply to you.</li>
      </ul>

      <h2 id="account">3. Your account</h2>
      <p>
        You need an account to use Vero. Give accurate information, keep your sign-in details secure, and tell us promptly if you think
        someone else has accessed your account. You&apos;re responsible for what happens in your account. One person per account;
        don&apos;t share it or sell it.
      </p>

      <h2 id="plans">4. Plans, payment and cancellation</h2>
      <ul>
        <li>
          <strong>Free plan.</strong> Free, with the usage limits shown on our pricing page. No payment details needed.
        </li>
        <li>
          <strong>Pro plan.</strong> {pricing.pro.price} per month (USD), with the limits shown on the pricing page. The price includes
          applicable taxes. Pro is billed monthly in advance and renews automatically every month until you cancel.
        </li>
        <li>
          <strong>Payments are handled by Dodo Payments</strong>, which acts as the merchant of record: it processes your payment,
          handles taxes and issues your invoices, and its terms also apply to your purchase. Your bank statement may show Dodo Payments.
          We never see or store your full card details.
        </li>
        <li>
          <strong>Cancel anytime</strong> from the <a href={`${APP_URL}/billing`}>Billing</a> page. You keep Pro until the end of the
          period you&apos;ve paid for, and you won&apos;t be charged again. Your resumes stay in your account on the Free plan.
        </li>
        <li>
          <strong>Refunds</strong> are covered by our <Link href="/refunds">Refund Policy</Link>, including a full refund of your first
          Pro payment if you ask within {legal.refundWindowDays} days.
        </li>
        <li>
          <strong>Failed payments.</strong> If a renewal payment fails, we&apos;ll keep Pro for a short grace period while the payment is
          retried. If it still fails, your account moves to the Free plan; nothing is deleted.
        </li>
        <li>
          <strong>Price changes.</strong> If we change the Pro price, we&apos;ll email you at least 14 days before it applies to your next
          renewal, so you can cancel first if you want to.
        </li>
        <li>
          <strong>Usage limits.</strong> Each plan has monthly limits (for example on AI features and compiles) to keep Vero fast and
          affordable for everyone. We may adjust them; if we lower a paid plan&apos;s limits, we&apos;ll tell you in advance.
        </li>
      </ul>

      <h2 id="content">5. Your content</h2>
      <p>
        <strong>You own what you create and upload</strong>: your resumes, the text you write, files you upload and the job descriptions
        you paste (&quot;your content&quot;). You give us permission to store, process, display and transmit your content only as needed
        to run Vero for you, including sending it to the service providers listed in our <Link href="/privacy">Privacy Policy</Link> (for
        example, to our AI provider to produce the edits you ask for, and to our compile service to produce your PDF). This permission
        ends when you delete the content or your account, apart from the short backup period described in the Privacy Policy.
      </p>
      <p>
        You&apos;re responsible for your content: make sure you have the right to use it and that what you put on your resume is true.
        Don&apos;t upload other people&apos;s personal information without their permission.
      </p>

      <h2 id="ai">6. AI features and the ATS check</h2>
      <ul>
        <li>
          AI features suggest changes; they can be wrong, incomplete or badly worded. <strong>Always review AI suggestions before you
          keep them</strong>, and check that your resume is accurate. Vero shows AI changes as edits you choose to keep or undo, and is
          designed not to invent facts, but you&apos;re responsible for the final document.
        </li>
        <li>
          The ATS check and job match are <strong>estimates</strong> based on common practices. Employers use many different systems and
          processes, so a score doesn&apos;t guarantee how any particular system or recruiter will read your resume.
        </li>
        <li>Vero doesn&apos;t guarantee interviews, job offers or any other outcome.</li>
      </ul>

      <h2 id="templates">7. Templates</h2>
      <p>
        Many of Vero&apos;s templates are open-source designs by other authors, shown with their author and licence (such as MIT, LPPL
        or CC BY). You can use them for your own resumes. Some licences ask you to keep a credit or notice in the source; where a template
        includes one, please leave it in.
      </p>

      <h2 id="acceptable-use">8. Acceptable use</h2>
      <p>Don&apos;t use Vero to:</p>
      <ul>
        <li>break the law, or create or share content that is fraudulent, defamatory, harassing, hateful or infringes others&apos; rights;</li>
        <li>
          attack or misuse the service: try to run code on our servers, break out of the compile sandbox, access other users&apos; data,
          probe or overload our systems, or get around usage limits or payment;
        </li>
        <li>scrape Vero, or use automated means to access it except through features we provide;</li>
        <li>resell, sublicense or offer Vero to others as your own service;</li>
        <li>copy or reverse-engineer Vero&apos;s software, except where the law allows it.</li>
      </ul>

      <h2 id="termination">9. Suspension and deletion</h2>
      <p>
        You can stop using Vero at any time, and you can delete your account from the <a href={`${APP_URL}/account`}>Account</a> page.
        Deleting your account cancels any active subscription and permanently deletes your data, as described in the Privacy Policy.
      </p>
      <p>
        We may suspend or close an account that seriously or repeatedly breaks these terms, or where we&apos;re required to by law.
        Unless it would be unlawful or put others at risk, we&apos;ll tell you why and give you a chance to download your resumes first.
        If we close a paid account without a breach on your part, we&apos;ll refund the unused part of your current billing period.
      </p>

      <h2 id="availability">10. Availability and warranties</h2>
      <p>
        We work to keep Vero available and your data safe, but Vero is provided &quot;as is&quot; and &quot;as available&quot;. We
        don&apos;t promise it will be uninterrupted or error-free, or that it will meet every need. Keep your own copies of important
        documents (you can download your PDF at any time). Nothing in these terms removes rights you have under consumer protection law
        that can&apos;t be excluded.
      </p>

      <h2 id="liability">11. Limitation of liability</h2>
      <p>
        To the extent the law allows, we aren&apos;t liable for indirect or consequential losses (such as lost opportunities, lost profits
        or lost data), and our total liability to you for any claim relating to Vero is limited to the amount you paid us in the 12
        months before the claim, or USD 10 if you haven&apos;t paid us anything. These limits don&apos;t apply to liability that
        can&apos;t be limited by law, such as for fraud.
      </p>

      <h2 id="third-parties">12. Third-party services</h2>
      <p>
        Vero relies on other companies&apos; services, such as sign-in, payments and AI (listed in the Privacy Policy). Your use of those
        parts may also be subject to their terms, for example Dodo Payments&apos; terms when you pay.
      </p>

      <h2 id="changes">13. Changes to these terms</h2>
      <p>
        We may update these terms as Vero changes. We&apos;ll post the new version here with a new effective date, and for significant
        changes we&apos;ll also email you or show a notice in the app before they take effect. If you keep using Vero after that, the new
        terms apply; if you don&apos;t agree, you can cancel and delete your account.
      </p>

      <h2 id="law">14. Governing law</h2>
      <p>
        These terms are governed by the laws of India, and the courts in India have jurisdiction over any dispute about them. If you live
        elsewhere, you keep any protections that the laws of your country give you and that can&apos;t be waived. Before starting any
        formal dispute, please contact us: most problems can be fixed quickly.
      </p>

      <h2 id="contact">15. Contact</h2>
      <ContactBlock />
    </LegalPage>
  )
}
