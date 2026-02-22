import type { Metadata } from "next";
import { VerifyUploadPage } from "./verify-upload-page";

export const metadata: Metadata = {
  title: "Verify Track Record — AlgoStudio",
  description: "Upload a proof bundle JSON file to independently verify a trading track record.",
};

export default function VerifyPage() {
  return <VerifyUploadPage />;
}
