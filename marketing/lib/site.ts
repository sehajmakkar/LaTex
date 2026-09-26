/**
 * Brand, links and pricing for the marketing site. Pricing mirrors the app's
 * `latex-ai-editor/src/lib/plans.ts` and billing page; keep them in sync.
 */

/** The dashboard app. Override per environment with NEXT_PUBLIC_APP_URL. */
export const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://hirex-omega.vercel.app").replace(/\/$/, "")

/** This site's public URL, used for canonical links, sitemap and share images. */
export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL || "https://texels.vercel.app").replace(/\/$/, "")

/** Optional contact address (footer "Contact" link). */
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL || ""

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
  pro: `${APP_URL}/sign-up?intent=pro`,
  templates: `${APP_URL}/templates`,
}

export const pricing = {
  free: { resumes: 3, aiEditsPerMonth: 40 },
  pro: { price: "$5.99", aiEditsPerMonth: 1000 },
}
