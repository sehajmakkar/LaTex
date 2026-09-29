/**
 * Brand, links and pricing for the marketing site. Pricing mirrors the app's
 * `latex-ai-editor/src/lib/plans.ts` and billing page; keep them in sync.
 */

/** The dashboard app. Override per environment with NEXT_PUBLIC_APP_URL. */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://dashboard.withvero.app").replace(/\/$/, "")

/** This site's public URL, used for canonical links, sitemap and share images. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.withvero.app").replace(/\/$/, "")

/** Contact address for support, privacy and refund requests (footer "Contact" link and legal pages). */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || "sehajmakkar007@gmail.com"

/** Who operates Vero, for the Terms, Privacy Policy and Refund Policy. */
export const legal = {
  /** Must match the name on your ID/bank account (it's the party customers contract with). */
  operator: "Sehaj Preet",
  location: "India",
  /** Date the current versions of the legal pages took effect. Update it whenever they change. */
  effectiveDate: "29 September 2026",
  x: { handle: "@sehajmakkarr", url: "https://x.com/sehajmakkarr" },
  linkedin: "https://www.linkedin.com/in/sehajmakkar/",
  refundWindowDays: 7,
}

export const site = {
  name: "Vero",
  author: "Sehaj",
  title: "Vero: AI-native LaTeX resume builder with a free ATS check",
  description:
    "Write, refine and check your resume in one place. Vero is a LaTeX resume editor with live PDF preview, inline AI editing, professional templates and a free ATS check.",
}

/**
 * Deep links into the dashboard. Sign-up/sign-in come first; the `intent`
 * then takes the user to the right page (see the app's src/lib/intents.ts).
 */
export const appLinks = {
  start: `${APP_URL}/sign-up?intent=start`,
  signIn: `${APP_URL}/sign-in`,
  ats: `${APP_URL}/sign-up?intent=ats`,
  /** Import an existing resume (Overleaf .zip/.tex, PDF, Word). */
  import: `${APP_URL}/sign-up?intent=import`,
  pro: `${APP_URL}/sign-up?intent=pro`,
  templates: `${APP_URL}/templates`,
}

export const pricing = {
  free: { resumes: 3, aiEditsPerMonth: 40, aiCommandsPerMonth: 10, atsAiReviewsPerMonth: 5 },
  pro: {
    price: "$4.99",
    /** Regular price, shown struck through while the launch price runs. */
    listPrice: "$7.99",
    aiEditsPerMonth: 1000,
    aiCommandsPerMonth: 120,
    atsAiReviewsPerMonth: 60,
    aiImportsPerMonth: 50,
    versionsKept: 100,
  },
}
