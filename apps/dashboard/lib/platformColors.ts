/** Brand colors for charts, calendar chips, and integration cards (not mock metrics). */
export const platformColors: Record<string, string> = {
  FACEBOOK: "#1877F2",
  INSTAGRAM: "#E4405F",
  GOOGLE: "#4285F4",
  LINKEDIN: "#0A66C2",
  YOUTUBE: "#FF0000",
  WHATSAPP: "#25D366",
  WhatsApp: "#25D366",
  Facebook: "#1877F2",
  Instagram: "#E4405F",
  Google: "#4285F4",
  LinkedIn: "#0A66C2",
  YouTube: "#FF0000",
  Meta: "#1877F2",
};

export function platformHex(platformKey: string): string {
  return platformColors[platformKey] ?? platformColors[platformKey.toUpperCase()] ?? "#6845ab";
}
