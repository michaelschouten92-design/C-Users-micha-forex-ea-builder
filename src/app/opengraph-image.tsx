import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "AlgoStudio - No-Code MT5 Expert Advisor Builder";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0D0117 0%, #1A0626 50%, #0D0117 100%)",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {/* Decorative gradient orbs */}
      <div
        style={{
          position: "absolute",
          top: "-100px",
          right: "-100px",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(79,70,229,0.3) 0%, transparent 70%)",
          display: "flex",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-100px",
          left: "-100px",
          width: "400px",
          height: "400px",
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(167,139,250,0.2) 0%, transparent 70%)",
          display: "flex",
        }}
      />

      {/* Content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "24px",
          zIndex: 1,
        }}
      >
        <div
          style={{
            fontSize: "64px",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-2px",
          }}
        >
          AlgoStudio
        </div>
        <div
          style={{
            fontSize: "28px",
            color: "#A78BFA",
            fontWeight: 600,
          }}
        >
          No-Code MT5 Expert Advisor Builder
        </div>
        <div
          style={{
            display: "flex",
            gap: "16px",
            marginTop: "16px",
          }}
        >
          {["Visual Builder", "One-Click Export", "MQL5 Code"].map((text) => (
            <div
              key={text}
              style={{
                padding: "10px 24px",
                borderRadius: "8px",
                border: "1px solid rgba(79,70,229,0.4)",
                color: "#CBD5E1",
                fontSize: "18px",
                display: "flex",
              }}
            >
              {text}
            </div>
          ))}
        </div>
      </div>
    </div>,
    { ...size }
  );
}
