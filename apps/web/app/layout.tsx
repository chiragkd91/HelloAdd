import type { Metadata, Viewport } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import { SITE_NAME, SITE_URL } from "@/lib/seo";
import "../styles/globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6845ab",
};

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

/** Footer watermark only — not used for body text */
const watermarkFont = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-watermark",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Hello Add — Sab Ads. Ek Jagah.",
    template: `%s | ${SITE_NAME}`,
  },
  description: "Unified CMO Ad Intelligence for marketing teams in India and APAC.",
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_IN",
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${watermarkFont.variable}`}>
      {/* Inter on body; --font-watermark for footer decorative type only */}
      <body className={inter.className}>{children}</body>
    </html>
  );
}
