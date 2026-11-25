import type { MetadataRoute } from "next";
import { absoluteUrl, INDEXED } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  if (!INDEXED) return { rules: { userAgent: "*", disallow: "/" } };
  return {
    // (The visitor's own pages also say noindex: search engines see that only where they may look)
    rules: { userAgent: "*", allow: "/", disallow: ["/signin", "/settings"] },
    sitemap: absoluteUrl("/sitemap.xml"),
  };
}
