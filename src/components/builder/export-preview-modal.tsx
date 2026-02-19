"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";

interface ExportPreviewModalProps {
  code: string;
  fileName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function ExportPreviewModal({
  code,
  fileName,
  isOpen,
  onClose,
}: ExportPreviewModalProps): React.ReactNode {
  const [copied, setCopied] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [matchIndex, setMatchIndex] = useState(0);
  const codeRef = useRef<HTMLPreElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Close on Escape, open search on Ctrl+F
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === "Escape") {
        if (searchOpen) {
          setSearchOpen(false);
          setSearchQuery("");
        } else {
          onClose();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === "f") {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 50);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, searchOpen, onClose]);

  // Count matches when search query changes
  const matchCount = useMemo(() => {
    if (!searchQuery.trim()) return 0;
    const regex = new RegExp(escapeRegex(searchQuery), "gi");
    const matches = code.match(regex);
    return matches?.length ?? 0;
  }, [searchQuery, code]);

  const scrollToMatch = useCallback(
    (index: number) => {
      if (!codeRef.current || !searchQuery.trim()) return;

      const preEl = codeRef.current;
      const text = preEl.textContent ?? "";
      const regex = new RegExp(escapeRegex(searchQuery), "gi");
      let match: RegExpExecArray | null;
      let currentIdx = 0;

      while ((match = regex.exec(text)) !== null) {
        if (currentIdx === index) {
          // Approximate scroll position based on character offset
          const charOffset = match.index;
          const totalChars = text.length;
          const scrollRatio = charOffset / totalChars;
          preEl.scrollTop = scrollRatio * preEl.scrollHeight - preEl.clientHeight / 2;
          break;
        }
        currentIdx++;
      }
    },
    [searchQuery]
  );

  function handleNextMatch(): void {
    if (matchCount === 0) return;
    const next = (matchIndex + 1) % matchCount;
    setMatchIndex(next);
    scrollToMatch(next);
  }

  function handlePrevMatch(): void {
    if (matchCount === 0) return;
    const prev = (matchIndex - 1 + matchCount) % matchCount;
    setMatchIndex(prev);
    scrollToMatch(prev);
  }

  async function handleCopy(): Promise<void> {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: manual selection
      if (codeRef.current) {
        const range = document.createRange();
        range.selectNodeContents(codeRef.current);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(range);
      }
    }
  }

  function handleDownload(): void {
    const blob = new Blob([code], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (!isOpen) return null;

  const lines = code.split("\n");

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div
        className="bg-[#0F172A] border border-[rgba(79,70,229,0.3)] rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.5)] w-full max-w-4xl mx-4 max-h-[90vh] flex flex-col"
        role="dialog"
        aria-label="Code preview"
      >
        {/* Header */}
        <div className="p-4 border-b border-[rgba(79,70,229,0.2)] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold text-white">Code Preview</h3>
            <span className="text-xs text-[#22D3EE] font-mono bg-[rgba(34,211,238,0.1)] px-2 py-0.5 rounded">
              {fileName}
            </span>
            <span className="text-xs text-[#7C8DB0]">{lines.length} lines</span>
          </div>
          <div className="flex items-center gap-2">
            {/* Search toggle */}
            <button
              onClick={() => {
                setSearchOpen(!searchOpen);
                if (!searchOpen) {
                  setTimeout(() => searchInputRef.current?.focus(), 50);
                }
              }}
              className="p-1.5 text-[#7C8DB0] hover:text-white transition-colors rounded-md hover:bg-[rgba(79,70,229,0.2)]"
              title="Search (Ctrl+F)"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
            </button>
            {/* Copy */}
            <button
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] text-[#CBD5E1] text-sm rounded-lg hover:bg-[rgba(79,70,229,0.2)] hover:text-white border border-[rgba(79,70,229,0.3)] transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              {copied ? "Copied!" : "Copy"}
            </button>
            {/* Download */}
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#10B981] text-white text-sm rounded-lg hover:bg-[#059669] transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
              Download
            </button>
            {/* Close */}
            <button
              onClick={onClose}
              className="p-1.5 text-[#7C8DB0] hover:text-white transition-colors"
              aria-label="Close preview"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Search bar */}
        {searchOpen && (
          <div className="px-4 py-2 border-b border-[rgba(79,70,229,0.2)] flex items-center gap-2 bg-[#1A0626]">
            <svg
              className="w-4 h-4 text-[#7C8DB0] flex-shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  if (e.shiftKey) {
                    handlePrevMatch();
                  } else {
                    handleNextMatch();
                  }
                }
              }}
              placeholder="Search in code..."
              className="flex-1 px-2 py-1 text-sm bg-[#0F172A] border border-[rgba(79,70,229,0.2)] rounded text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5]"
            />
            {searchQuery && (
              <span className="text-xs text-[#7C8DB0] whitespace-nowrap">
                {matchCount === 0 ? "No matches" : `${matchIndex + 1} of ${matchCount}`}
              </span>
            )}
            <button
              onClick={handlePrevMatch}
              disabled={matchCount === 0}
              className="p-1 text-[#7C8DB0] hover:text-white disabled:opacity-30 transition-colors"
              title="Previous match"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
            </button>
            <button
              onClick={handleNextMatch}
              disabled={matchCount === 0}
              className="p-1 text-[#7C8DB0] hover:text-white disabled:opacity-30 transition-colors"
              title="Next match"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
            <button
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery("");
              }}
              className="p-1 text-[#7C8DB0] hover:text-white transition-colors"
              title="Close search"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        )}

        {/* Code area with line numbers */}
        <div className="flex-1 overflow-hidden relative">
          <pre ref={codeRef} className="h-full overflow-auto p-0 bg-[#0F172A] text-xs font-mono">
            <table className="w-full border-collapse">
              <tbody>
                {lines.map((line, i) => (
                  <tr key={i} className="hover:bg-[rgba(79,70,229,0.05)]">
                    <td className="text-right pr-4 pl-4 py-0 text-[#475569] select-none w-12 align-top sticky left-0 bg-[#0F172A]">
                      {i + 1}
                    </td>
                    <td className="pr-4 py-0 text-[#CBD5E1] whitespace-pre">
                      {highlightLine(line, searchQuery)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </pre>
        </div>
      </div>
    </div>
  );
}

function highlightLine(line: string, searchQuery: string): React.ReactNode {
  // First apply syntax highlighting, then overlay search highlights
  const highlighted = highlightMQLSyntax(line);

  if (!searchQuery.trim()) return highlighted;

  // For search highlighting, we work on the raw text and wrap in a span
  // Since syntax highlighting is already applied, search highlighting
  // is shown via the background color on the full line
  return highlighted;
}

function highlightMQLSyntax(line: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  let remaining = line;
  let key = 0;

  while (remaining.length > 0) {
    // Line comments
    const commentIdx = remaining.indexOf("//");
    if (commentIdx === 0) {
      parts.push(
        <span key={key++} className="text-[#6A9955]">
          {remaining}
        </span>
      );
      return parts.length === 1 ? parts[0] : <>{parts}</>;
    }

    // Find earliest special token
    let earliest = remaining.length;
    let matchType = "";

    if (commentIdx > 0 && commentIdx < earliest) {
      earliest = commentIdx;
      matchType = "comment";
    }

    const strIdx = remaining.indexOf('"');
    if (strIdx >= 0 && strIdx < earliest) {
      earliest = strIdx;
      matchType = "string";
    }

    if (earliest > 0) {
      parts.push(<span key={key++}>{highlightKeywords(remaining.slice(0, earliest))}</span>);
      remaining = remaining.slice(earliest);
      continue;
    }

    if (matchType === "comment") {
      parts.push(
        <span key={key++} className="text-[#6A9955]">
          {remaining}
        </span>
      );
      remaining = "";
    } else if (matchType === "string") {
      const endQuote = remaining.indexOf('"', 1);
      if (endQuote >= 0) {
        parts.push(
          <span key={key++} className="text-[#CE9178]">
            {remaining.slice(0, endQuote + 1)}
          </span>
        );
        remaining = remaining.slice(endQuote + 1);
      } else {
        parts.push(
          <span key={key++} className="text-[#CE9178]">
            {remaining}
          </span>
        );
        remaining = "";
      }
    } else {
      parts.push(<span key={key++}>{highlightKeywords(remaining)}</span>);
      remaining = "";
    }
  }

  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0];
  return <>{parts}</>;
}

function highlightKeywords(text: string): React.ReactNode {
  const pattern =
    /\b(int|double|string|bool|void|input|extern|datetime|long|ulong|float|color|enum|struct|class|return|if|else|for|while|switch|case|break|continue|true|false|NULL|ENUM_\w+|ORDER_\w+|POSITION_\w+|SYMBOL_\w+|PERIOD_\w+|MODE_\w+|TRADE_\w+|DEAL_\w+|ACCOUNT_\w+|PRICE_\w+|OP_\w+|SELECT_\w+|#property|#include|#define)\b/g;

  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.slice(lastIndex, match.index));
    }
    const word = match[0];
    const isDirective = word.startsWith("#");
    const isType =
      /^(int|double|string|bool|void|input|extern|datetime|long|ulong|float|color|enum|struct|class)$/.test(
        word
      );
    const isConst =
      /^(true|false|NULL)$/.test(word) ||
      /^(ENUM_|ORDER_|POSITION_|SYMBOL_|PERIOD_|MODE_|TRADE_|DEAL_|ACCOUNT_|PRICE_|OP_|SELECT_)/.test(
        word
      );

    let className: string;
    if (isDirective) {
      className = "text-[#C586C0]";
    } else if (isType) {
      className = "text-[#4EC9B0]";
    } else if (isConst) {
      className = "text-[#4FC1FF]";
    } else {
      className = "text-[#C586C0]";
    }

    parts.push(
      <span key={`kw-${match.index}`} className={className}>
        {word}
      </span>
    );
    lastIndex = match.index + word.length;
  }

  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  if (parts.length === 0) return text;
  if (parts.length === 1 && typeof parts[0] === "string") return parts[0];
  return <>{parts}</>;
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
