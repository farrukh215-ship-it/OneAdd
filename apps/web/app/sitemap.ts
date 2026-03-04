import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = "https://www.teragharmeraghar.com";
  const routes = [
    "",
    "/search",
    "/sell",
    "/reels",
    "/chat",
    "/account",
    "/my-listings"
  ];

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "" ? "daily" : "weekly",
    priority: route === "" ? 1 : 0.7
  }));
}
