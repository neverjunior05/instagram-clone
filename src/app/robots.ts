import type { MetadataRoute } from "next";
export default function robots(): MetadataRoute.Robots {
  return { rules: [{ userAgent: "*", allow: "/", disallow: ["/messages", "/notifications", "/saved", "/settings", "/admin", "/api", "/create", "/stories"] }], sitemap: "/sitemap.xml" };
}
