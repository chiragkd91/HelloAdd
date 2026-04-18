import { ImageResponse } from "next/og";

export const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

/** Shared 1200×630 preview — brand gradient + tagline (used by `opengraph-image` and `twitter-image`). */
export function defaultOgImageResponse() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #6845ab 0%, #553891 100%)",
          color: "#ffffff",
        }}
      >
        <div
          style={{
            fontSize: 72,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            fontFamily:
              'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          }}
        >
          Hello Add
        </div>
        <div
          style={{
            marginTop: 20,
            fontSize: 34,
            fontWeight: 600,
            opacity: 0.95,
            fontFamily:
              'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          }}
        >
          Sab Ads. Ek Jagah.
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 22,
            fontWeight: 500,
            opacity: 0.85,
            fontFamily:
              'ui-sans-serif, system-ui, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
          }}
        >
          helloadd.online
        </div>
      </div>
    ),
    { ...OG_IMAGE_SIZE },
  );
}
