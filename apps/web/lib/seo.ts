import type { Metadata } from "next";

const DEFAULT_SITE_URL = "https://helloadd.online";

function normalizeSiteUrl(url: string): string {
  const t = url.trim().replace(/\/$/, "");
  return t.length > 0 ? t : DEFAULT_SITE_URL;
}

/**
 * Public site origin for `metadataBase`, canonicals, and OG/Twitter absolute URLs.
 * Override per environment: `NEXT_PUBLIC_SITE_URL=https://helloadd.online` (no trailing slash).
 */
export const SITE_URL = normalizeSiteUrl(
  typeof process !== "undefined" && process.env.NEXT_PUBLIC_SITE_URL
    ? process.env.NEXT_PUBLIC_SITE_URL
    : DEFAULT_SITE_URL,
);

export const SITE_NAME = "Hello Add";

export const homeMetadata: Metadata = {
  title: { absolute: "Hello Add — Sab Ads. Ek Jagah." },
  description:
    "One CMO workspace for Meta, Google, LinkedIn, YouTube — live spend, AI guardrails, WhatsApp alerts, and reports. Built for India & APAC. Private beta.",
  applicationName: SITE_NAME,
  alternates: { canonical: "/" },
  openGraph: {
    title: "Hello Add — Sab Ads. Ek Jagah.",
    description:
      "Unified paid + organic, INR-first, one login. Try the beta — no card.",
    url: "/",
    siteName: SITE_NAME,
    locale: "en_IN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hello Add — Sab Ads. Ek Jagah.",
    description:
      "Unified paid + organic, INR-first, one login. Try the beta — no card.",
  },
  robots: { index: true, follow: true },
};

type PageSeo = {
  title: string;
  description: string;
  pathname: `/${string}`;
  /** Defaults to `description` */
  openGraphDescription?: string;
};

/**
 * Page titles use the root `title.template` (`%s | Hello Add`).
 * Sets canonical, Open Graph, and Twitter from `SITE_URL`.
 */
export function pageMetadata({ title, description, pathname, openGraphDescription }: PageSeo): Metadata {
  const ogDesc = openGraphDescription ?? description;
  const fullTitle = `${title} | ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: pathname },
    openGraph: {
      title: fullTitle,
      description: ogDesc,
      url: pathname,
      siteName: SITE_NAME,
      locale: "en_IN",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description: ogDesc,
    },
    robots: { index: true, follow: true },
  };
}
