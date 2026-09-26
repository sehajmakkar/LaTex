import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/site"

/** sitemap.xml: the pages search engines should crawl. Add new pages here. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [{ url: `${SITE_URL}/`, lastModified: new Date(), changeFrequency: "weekly", priority: 1 }]
}
