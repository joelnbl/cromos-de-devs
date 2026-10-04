import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/auth/", "/album", "/cambios", "/sobre", "/mi-cromo"] }],
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
