import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/** Public marketing routes — keep in sync when adding pages. */
const PATHS: string[] = [
  "/",
  "/about",
  "/agencies",
  "/blog",
  "/case-studies",
  "/changelog",
  "/contact",
  "/careers",
  "/docs/api",
  "/features",
  "/help",
  "/pricing",
  "/privacy",
  "/register",
  "/security",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL.replace(/\/$/, "");
  return PATHS.map((path) => ({
    url: path === "/" ? base : `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: path === "/" ? "weekly" : "monthly",
    priority: path === "/" ? 1 : 0.7,
  }));
}
