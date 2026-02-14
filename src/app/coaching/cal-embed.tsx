"use client";

import Cal from "@calcom/embed-react";

export function CoachingCalEmbed() {
  return (
    <Cal
      calLink="algostudio/coaching"
      config={{
        theme: "dark",
        layout: "month_view",
      }}
      style={{ width: "100%", height: "100%", overflow: "scroll" }}
    />
  );
}
