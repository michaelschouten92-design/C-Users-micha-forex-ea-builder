"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { ProofViewer } from "./[token]/proof-viewer";

export function VerifyUploadPage() {
  const [bundle, setBundle] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleFile = useCallback((file: File) => {
    setError(null);
    if (!file.name.endsWith(".json")) {
      setError("Please upload a JSON file");
      return;
    }
    if (file.size > 50 * 1024 * 1024) {
      setError("File is too large (max 50MB)");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target?.result as string);
        // Basic validation: check required fields
        if (!parsed.report || !parsed.events || !parsed.verification) {
          setError("Invalid proof bundle: missing required fields (report, events, verification)");
          return;
        }
        setBundle(parsed);
      } catch {
        setError("Invalid JSON file");
      }
    };
    reader.readAsText(file);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
  }, []);

  // Once a bundle is loaded, show the proof viewer
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (bundle) return <ProofViewer uploadedBundle={bundle as any} />;

  return (
    <div className="min-h-screen bg-[#0A0118]">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-16 sm:py-24">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-3">Verify Track Record</h1>
          <p className="text-[#7C8DB0]">
            Upload a proof bundle JSON file to independently verify a trading track record. No
            account required.
          </p>
        </div>

        {/* Drop zone */}
        <div
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`border-2 border-dashed rounded-2xl p-12 text-center transition-colors cursor-pointer ${
            dragging
              ? "border-[#4F46E5] bg-[#4F46E5]/5"
              : "border-[rgba(79,70,229,0.3)] hover:border-[rgba(79,70,229,0.5)]"
          }`}
          onClick={() => {
            const input = document.createElement("input");
            input.type = "file";
            input.accept = ".json";
            input.onchange = (e) => {
              const file = (e.target as HTMLInputElement).files?.[0];
              if (file) handleFile(file);
            };
            input.click();
          }}
        >
          <svg
            className="w-12 h-12 mx-auto text-[#7C8DB0] mb-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
          <p className="text-white font-medium mb-1">Drop proof bundle here</p>
          <p className="text-sm text-[#7C8DB0]">or click to browse — accepts .json files</p>
        </div>

        {error && (
          <div className="mt-4 px-4 py-3 rounded-xl bg-[#EF4444]/10 border border-[#EF4444]/20">
            <p className="text-sm text-[#EF4444]">{error}</p>
          </div>
        )}

        {/* Info */}
        <div className="mt-10 bg-[#1A0626] border border-[rgba(79,70,229,0.15)] rounded-xl p-6">
          <h3 className="text-sm font-medium text-white mb-3">How it works</h3>
          <div className="space-y-3 text-xs text-[#7C8DB0]">
            <div className="flex items-start gap-3">
              <span className="bg-[#4F46E5]/20 text-[#A78BFA] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                1
              </span>
              <p>Upload a proof bundle JSON exported from an AlgoStudio track record.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-[#4F46E5]/20 text-[#A78BFA] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                2
              </span>
              <p>
                The verifier checks the hash chain, Ed25519 signature, HMAC checkpoints, and
                deterministically replays all events.
              </p>
            </div>
            <div className="flex items-start gap-3">
              <span className="bg-[#4F46E5]/20 text-[#A78BFA] rounded-full w-5 h-5 flex items-center justify-center flex-shrink-0 text-[10px] font-bold">
                3
              </span>
              <p>All verification happens in your browser. No data is uploaded to any server.</p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-10">
          <Link href="/" className="text-sm text-[#7C8DB0] hover:text-[#A78BFA] transition-colors">
            Powered by AlgoStudio
          </Link>
        </div>
      </div>
    </div>
  );
}
