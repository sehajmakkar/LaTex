import type { Metadata } from "next"
import Link from "next/link"
import { ContactBlock, LegalPage } from "@/components/legal/legal-page"
import { APP_URL, CONTACT_EMAIL, legal } from "@/lib/site"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What data Vero collects, why, who processes it, and how to access or delete it.",
  alternates: { canonical: "/privacy" },
}

const PROVIDERS = [
  { name: "Clerk", role: "Sign-in and account management (including \"Continue with Google\")", data: "Name, email address, profile photo, sign-in sessions" },
  { name: "Neon", role: "Database hosting", data: "Your account record and everything you create in Vero" },
  { name: "Cloudflare (R2)", role: "File storage", data: "Resume files you upload for an ATS check, and preview images of your resumes" },
  { name: "Google (Gemini API)", role: "AI processing for AI edits, the command bar, import and the ATS review", data: "The resume text, instructions and job descriptions involved in that request" },
  { name: "Railway", role: "Turning your LaTeX into a PDF", data: "Your LaTeX source, only while it compiles; deleted as soon as the PDF is made" },
  { name: "Vercel", role: "Hosting the website and app; privacy-friendly analytics", data: "Technical request data (such as IP address and browser); aggregated page views and performance, without cookies" },
  { name: "Dodo Payments", role: "Payments, as merchant of record", data: "Your payment details, billing address and email. We receive only a customer ID and your subscription status and dates" },
]

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      current="/privacy"
      intro={
        <>
          <p>
            Your resume holds a lot of personal information, so we collect only what we need to run Vero, and nothing more. This policy
            explains what we collect, why, who helps us process it, and how you can access or delete it.
          </p>
          <p className="mt-4">
            Vero is operated by {legal.operator}, an individual based in {legal.location}, who is responsible for your personal data
            (the &quot;data controller&quot; or &quot;data fiduciary&quot;).
          </p>
        </>
      }
    >
      <h2 id="short-version">The short version</h2>
      <ul>
        <li>We use your data to run Vero for you. We don&apos;t sell it and don&apos;t use it for advertising.</li>
        <li>We don&apos;t use your resumes to train AI models.</li>
        <li>No advertising or tracking cookies. Our analytics count page views without cookies.</li>
        <li>
          You can delete your account, and everything in it, yourself at any time from the{" "}
          <a href={`${APP_URL}/account`}>Account</a> page.
        </li>
      </ul>

      <h2 id="what-we-collect">1. What we collect</h2>
      <h3>Account information</h3>
      <p>
        Your name and email address, and your profile photo if you sign in with Google. Sign-in is handled by Clerk, so we never see your
        Google password.
      </p>
      <h3>What you create in Vero</h3>
      <ul>
        <li>Your resumes and documents (the LaTeX source, names and templates used), and earlier versions saved before AI changes.</li>
        <li>What you ask the AI features to do, and their replies (your command bar conversation for each resume).</li>
        <li>
          ATS checks: the resume file you upload or the resume you check, the text extracted from it, any job description you paste, and
          the report.
        </li>
        <li>
          Files you import (Overleaf .zip/.tex, PDF, Word, text) are processed to create your resume and are not kept as files
          afterwards.
        </li>
        <li>A small preview image of each resume&apos;s first page, shown on your dashboard.</li>
      </ul>
      <h3>Usage and billing</h3>
      <ul>
        <li>Counts of what you use each month (compiles, AI edits, ATS checks, imports) so we can apply plan limits.</li>
        <li>
          If you subscribe: your plan, subscription status and renewal dates, and the IDs Dodo Payments gives your customer record and
          subscription. <strong>We never receive your full card details</strong>; Dodo Payments handles them.
        </li>
      </ul>
      <h3>Technical data</h3>
      <p>
        When you visit, our hosting provider processes technical data such as your IP address, browser type and the pages requested, to
        deliver the site and protect it from abuse. We keep application logs (for example, that a compile succeeded or an AI request took
        4 seconds) for troubleshooting; they don&apos;t include your resume content.
      </p>

      <h2 id="how-we-use">2. How we use it</h2>
      <ul>
        <li>To provide Vero: store your resumes, compile them into PDFs, run the AI features and ATS checks you ask for.</li>
        <li>To manage your account, subscription and plan limits.</li>
        <li>To keep Vero secure and working: prevent abuse, fix bugs and understand overall usage (in aggregate).</li>
        <li>To contact you about your account, billing or important changes to Vero. We won&apos;t send marketing emails without your consent.</li>
        <li>To meet legal obligations, such as tax and accounting records (kept by Dodo Payments as merchant of record).</li>
      </ul>
      <p>
        We process your data because it&apos;s needed to provide the service you signed up for, with your consent (which you can withdraw
        by deleting your account), for our legitimate interest in keeping Vero secure and working, and where the law requires it.
      </p>
      <p>
        We only look at your content when we need to: to help with a request you&apos;ve made, to fix a problem, or to investigate abuse.
      </p>

      <h2 id="ai">3. How AI features use your data</h2>
      <p>
        When you use an AI feature (inline AI edits, the command bar, AI import, or the AI part of the ATS check), the relevant resume
        text and your instructions or job description are sent to Google&apos;s Gemini API to produce the result. We use Google&apos;s
        paid API service; under Google&apos;s terms for paid services, Google doesn&apos;t use this content to improve its products, and
        keeps it only for a limited period to detect abuse and meet legal requirements. We don&apos;t use your content to train AI models
        either.
      </p>

      <h2 id="providers">4. Who processes your data</h2>
      <p>
        We use these service providers to run Vero. They process data on our behalf, only for the purposes above, under their own privacy
        and security commitments.
      </p>
      <div className="mt-5 overflow-x-auto rounded-xl border border-zinc-800">
        <table className="w-full min-w-[560px] text-left text-sm">
          <thead className="bg-zinc-900/60 text-zinc-300">
            <tr>
              <th className="px-4 py-3 font-medium">Provider</th>
              <th className="px-4 py-3 font-medium">What for</th>
              <th className="px-4 py-3 font-medium">Data involved</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800 text-zinc-400">
            {PROVIDERS.map((p) => (
              <tr key={p.name}>
                <td className="px-4 py-3 align-top font-medium text-zinc-200">{p.name}</td>
                <td className="px-4 py-3 align-top">{p.role}</td>
                <td className="px-4 py-3 align-top">{p.data}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        We don&apos;t sell or rent your personal data. We&apos;ll share it with anyone else only if the law requires it (for example, a
        valid court order), to protect people&apos;s safety or our rights, or as part of a sale or reorganisation of Vero, in which case
        this policy would continue to protect it and we&apos;d tell you first.
      </p>

      <h2 id="transfers">5. Where your data is processed</h2>
      <p>
        Most of our providers run their services in data centres outside India, for example in the United States or the European Union, so
        your data may be processed there. We choose established providers that protect data in transit and at rest.
      </p>

      <h2 id="retention">6. How long we keep it</h2>
      <ul>
        <li>
          <strong>While you have an account</strong>, we keep your resumes, versions, AI conversations and ATS reports so you can use
          them. You can delete individual resumes at any time.
        </li>
        <li>
          <strong>When you delete your account</strong>, we cancel any active subscription and permanently delete your account record,
          resumes, versions, AI conversations, ATS reports, uploaded files and preview images. Deleted data may remain in our
          providers&apos; encrypted backups for up to 30 days before it&apos;s overwritten.
        </li>
        <li>
          We keep a minimal record of payment events (event type, date and subscription ID) for accounting and to prevent fraud. Dodo
          Payments keeps transaction records as the law requires.
        </li>
        <li>Technical logs are kept for a short period, typically a few days to a few weeks.</li>
      </ul>

      <h2 id="rights">7. Your rights and choices</h2>
      <p>Depending on where you live, you have rights over your personal data, including to:</p>
      <ul>
        <li>
          <strong>Access and correct it:</strong> most of it is visible and editable in the app; your name and email are in your account
          settings.
        </li>
        <li>
          <strong>Delete it:</strong> delete resumes one by one, or your whole account from the <a href={`${APP_URL}/account`}>Account</a>{" "}
          page.
        </li>
        <li>
          <strong>Take a copy:</strong> download your resume PDFs and copy your LaTeX source at any time; email us for a copy of anything
          else we hold about you.
        </li>
        <li>
          <strong>Withdraw consent or object</strong> to how we use your data.
        </li>
        <li>
          <strong>Nominate</strong> someone to exercise your rights if you die or become unable to (under India&apos;s Digital Personal
          Data Protection Act).
        </li>
        <li>
          <strong>Complain</strong> to a data protection authority, such as the Data Protection Board of India, or your local authority
          if you live in the EU or UK. We&apos;d appreciate the chance to fix things first.
        </li>
      </ul>
      <p>
        To use any of these rights, email <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a> from your account&apos;s address. We
        may need to confirm it&apos;s you, and we&apos;ll respond within 30 days.
      </p>

      <h2 id="cookies">8. Cookies and local storage</h2>
      <p>
        The app uses essential cookies from Clerk to keep you signed in, and your browser&apos;s local storage to remember preferences
        such as light or dark theme. Our analytics (Vercel Web Analytics and Speed Insights) don&apos;t use cookies and count visits in
        aggregate. We don&apos;t use advertising or cross-site tracking cookies.
      </p>

      <h2 id="children">9. Students and children</h2>
      <p>
        Vero is used by high-school and college students. You must be at least 13 to use it. If you&apos;re under 18, you need the
        permission of a parent or legal guardian, who agrees to our terms and this policy for you. A parent or guardian can contact us at
        any time to review or delete their child&apos;s data. If we learn that someone under 13 has an account, or that someone under 18
        is using Vero without a parent&apos;s or guardian&apos;s permission, we&apos;ll delete the account.
      </p>

      <h2 id="security">10. Security</h2>
      <ul>
        <li>All traffic to Vero is encrypted with HTTPS, and our providers encrypt stored data.</li>
        <li>Every request for a resume, file or report is checked against your account, so other users can&apos;t reach your data.</li>
        <li>Resumes are compiled in an isolated sandbox that can&apos;t reach other users&apos; files, and is cleared after each compile.</li>
        <li>Card payments are handled entirely by Dodo Payments; card details never reach our servers.</li>
      </ul>
      <p>
        No system is perfectly secure. If a breach affects your personal data, we&apos;ll notify you and the relevant authorities as the
        law requires. If you find a security issue, please report it to <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
      </p>

      <h2 id="changes">11. Changes to this policy</h2>
      <p>
        We&apos;ll post any changes here with a new effective date. If a change significantly affects how we use your data, we&apos;ll
        email you or show a notice in the app before it takes effect. See also our <Link href="/terms">Terms of Service</Link>.
      </p>

      <h2 id="contact">12. Contact and grievances</h2>
      <p>
        For questions, requests or complaints about your personal data, contact {legal.operator}, who handles privacy and grievances for
        Vero.
      </p>
      <ContactBlock />
    </LegalPage>
  )
}
