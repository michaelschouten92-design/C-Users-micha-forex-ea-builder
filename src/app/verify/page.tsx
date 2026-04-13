import type { Metadata } from "next";
import { VerifyUploadPage } from "./verify-upload-page";

const baseUrl = process.env.SITE_URL ?? "https://algo-studio.com";

export const metadata: Metadata = {
  title: "Verify Track Record — Algo Studio",
  description: "Upload a proof bundle JSON file to independently verify a trading track record.",
  alternates: { canonical: `${baseUrl}/verify` },
};

export default function VerifyPage() {
  return <VerifyUploadPage />;
}
