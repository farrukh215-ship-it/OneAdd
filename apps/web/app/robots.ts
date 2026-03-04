import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/"
    },
    sitemap: "https://www.teragharmeraghar.com/sitemap.xml",
    host: "https://www.teragharmeraghar.com"
  };
}
