import { ImageResponse } from "next/og";
import { SITE_NAME, SITE_TAGLINE } from "@/constants/site";

export const alt = `${SITE_NAME} — Qué ver en YouTube`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          color: "#fafafa",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 16,
          }}
        >
          <div
            style={{
              display: "flex",
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#171717",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 32 32">
              <path d="M13 10.5v11l9-5.5z" fill="#ff5a3c" />
            </svg>
          </div>
          <span style={{ fontSize: 56, fontWeight: 700, letterSpacing: "-0.03em" }}>
            {SITE_NAME}
          </span>
        </div>
        <span
          style={{
            marginTop: 24,
            fontSize: 28,
            color: "#a1a1aa",
            textAlign: "center",
            padding: "0 80px",
          }}
        >
          {SITE_TAGLINE}
        </span>
      </div>
    ),
    { ...size }
  );
}
