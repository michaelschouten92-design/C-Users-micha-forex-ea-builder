"use client";

import { useEffect } from "react";

export function CoachingCalEmbed() {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://assets.calendly.com/assets/external/widget.js";
    script.async = true;
    document.body.appendChild(script);
    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div
      className="calendly-inline-widget"
      data-url="https://calendly.com/algo-studio-support/60-minute-meeting?hide_gdpr_banner=1&background_color=1a0626&text_color=cbd5e1&primary_color=4f46e5"
      style={{ minWidth: "320px", height: "700px", width: "100%" }}
    />
  );
}
