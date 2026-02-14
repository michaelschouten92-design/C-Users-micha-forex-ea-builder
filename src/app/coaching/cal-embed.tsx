"use client";

import { useEffect, useRef } from "react";

export function CoachingCalEmbed() {
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    // Check if script already exists
    const existing = document.querySelector(
      'script[src="https://assets.calendly.com/assets/external/widget.js"]'
    );
    if (!existing) {
      const script = document.createElement("script");
      script.src = "https://assets.calendly.com/assets/external/widget.js";
      script.async = true;
      document.head.appendChild(script);
    }
  }, []);

  return (
    <>
      <link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet" />
      <div
        className="calendly-inline-widget"
        data-url="https://calendly.com/algo-studio-support/60-minute-meeting?hide_gdpr_banner=1&background_color=1a0626&text_color=cbd5e1&primary_color=4f46e5"
        style={{ minWidth: "320px", height: "700px", width: "100%" }}
      />
    </>
  );
}
