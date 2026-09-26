import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

/**
 * robots.txt: lets search engines index the production site and points them to
 * the sitemap. Vercel preview deployments are blocked so they never show up in
 * search results next to the real site.
 */
export default function robots(): MetadataRoute.Robots {
  const isPreview = process.env.VERCEL_ENV === "preview"
  return {
    rules: isPreview ? { userAgent: "*", disallow: "/" } : { userAgent: "*", allow: "/" },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
