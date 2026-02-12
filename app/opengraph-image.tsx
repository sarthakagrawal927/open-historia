import { ImageResponse } from "next/og";

export const alt = "Open Historia - AI Grand Strategy Game";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        {/* Top border accent */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, transparent, #f59e0b, transparent)",
          }}
        />

        {/* Title */}
        <div
          style={{
            fontSize: 80,
            fontWeight: 900,
            color: "#f59e0b",
            letterSpacing: 8,
            lineHeight: 1,
          }}
        >
          OPEN HISTORIA
        </div>

        {/* Divider */}
        <div
          style={{
            width: 200,
            height: 2,
            background: "linear-gradient(90deg, transparent, #b45309, transparent)",
            marginTop: 24,
            marginBottom: 24,
          }}
        />

        {/* Subtitle */}
        <div
          style={{
            fontSize: 28,
            color: "#94a3b8",
            letterSpacing: 6,
            textTransform: "uppercase",
          }}
        >
          AI Grand Strategy Game
        </div>

        {/* Description */}
        <div
          style={{
            fontSize: 20,
            color: "#64748b",
            marginTop: 20,
            maxWidth: 700,
            textAlign: "center",
            lineHeight: 1.5,
            fontFamily: "sans-serif",
          }}
        >
          Command nations across all of history with an AI Game Master
        </div>

        {/* Bottom border accent */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, transparent, #f59e0b, transparent)",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
