import { defaultOgImageResponse, OG_IMAGE_SIZE } from "@/lib/og-default-image";

export const runtime = "edge";

export const alt = "Hello Add — Sab Ads. Ek Jagah.";
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

export default function OpenGraphImage() {
  return defaultOgImageResponse();
}
