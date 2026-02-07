import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #4F46E5, #7C3AED)",
          borderRadius: "40px",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            fontSize: "96px",
            fontWeight: 800,
            color: "#ffffff",
            letterSpacing: "-4px",
          }}
        >
          A
        </div>
      </div>
    ),
    { ...size }
  );
}
