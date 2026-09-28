import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

/** sitemap.xml: the pages search engines should crawl. Add new pages here. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 },
    ...["terms", "privacy", "refunds"].map((page) => ({
      url: `${SITE_URL}/${page}`,
      changeFrequency: "yearly" as const,
      priority: 0.3,
    })),
  ]
}
