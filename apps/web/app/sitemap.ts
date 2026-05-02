import type { MetadataRoute } from "next";
import { DASHBOARD_REGISTER_URL } from "@/lib/dashboardApi";
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
  "/security",
  "/terms",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const base = SITE_URL.replace(/\/$/, "");
  const marketing = PATHS.map((path) => ({
    url: path === "/" ? base : `${base}${path}`,
    lastModified: new Date(),
    changeFrequency: (path === "/" ? "weekly" : "monthly") as MetadataRoute.Sitemap[number]["changeFrequency"],
    priority: path === "/" ? 1 : 0.7,
  }));
  /** Sign-up lives on the dashboard host (session cookie origin). */
  const registerEntry: MetadataRoute.Sitemap[number] = {
    url: DASHBOARD_REGISTER_URL,
    lastModified: new Date(),
    changeFrequency: "monthly",
    priority: 0.8,
  };
  return [...marketing, registerEntry];
}
