"use client";

import { useMemo, useState } from "react";
import type { Node, Edge } from "@xyflow/react";
import type { BuildJsonSchema, BuilderNode } from "@/types/builder";
import { DEFAULT_SETTINGS } from "@/types/builder";
import { generateMQL5Code } from "@/lib/mql5-generator/generator";

interface CodePreviewPanelProps {
  nodes: Node[];
  edges: Edge[];
  settings?: BuildJsonSchema["settings"];
}

export function CodePreviewPanel({ nodes, edges, settings }: CodePreviewPanelProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const code = useMemo(() => {
    if (!isOpen || nodes.length === 0) return "";
    try {
      const buildJson: BuildJsonSchema = {
        version: "1.0",
        nodes: nodes as BuilderNode[],
        edges,
        viewport: { x: 0, y: 0, zoom: 1 },
        metadata: { createdAt: "", updatedAt: "" },
        settings: settings ?? DEFAULT_SETTINGS,
      };
      return generateMQL5Code(buildJson, "Strategy");
    } catch {
      return "// Error generating code preview";
    }
  }, [isOpen, nodes, edges, settings]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="absolute bottom-14 left-4 z-20">
      {isOpen && (
        <div className="mb-2 w-[480px] max-w-[calc(100vw-2rem)] max-h-[50vh] bg-[#0F172A] border border-[rgba(79,70,229,0.3)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-2 border-b border-[rgba(79,70,229,0.2)] bg-[#1A0626]">
            <span className="text-xs font-medium text-[#CBD5E1]">MQL5 Preview</span>
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-[#64748B]">{code.split("\n").length} lines</span>
              <button
                onClick={handleCopy}
                className="text-xs text-[#94A3B8] hover:text-white transition-colors px-2 py-1 rounded hover:bg-[rgba(79,70,229,0.2)]"
              >
                {copied ? "Copied!" : "Copy"}
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-[#64748B] hover:text-white p-0.5 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
          <pre className="flex-1 overflow-auto p-3 text-[11px] text-[#CBD5E1] font-mono leading-relaxed whitespace-pre">
            {nodes.length === 0 ? "// Add nodes to see generated code" : code}
          </pre>
        </div>
      )}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all duration-200 shadow-lg ${
          isOpen
            ? "bg-[#4F46E5] text-white border-[#6366F1]"
            : "bg-[#1E293B] text-[#94A3B8] border-[rgba(79,70,229,0.3)] hover:text-white hover:border-[rgba(79,70,229,0.5)]"
        }`}
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
        {isOpen ? "Hide Code" : "Preview Code"}
      </button>
    </div>
  );
}
