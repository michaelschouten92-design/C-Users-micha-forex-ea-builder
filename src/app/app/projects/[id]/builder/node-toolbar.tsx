"use client";

import { useState } from "react";
import {
  NODE_TEMPLATES,
  getCategoryLabel,
  type NodeCategory,
  type NodeTemplate,
  type BuildJsonSettings,
} from "@/types/builder";
import { StrategySettingsPanel } from "./strategy-settings-panel";

// Static style maps — defined once outside component to avoid re-creation on every render
const CATEGORY_STYLES: Record<
  NodeCategory,
  { gradient: string; shadow: string; hoverShadow: string; border: string }
> = {
  timing: {
    gradient: "bg-gradient-to-r from-[#FF6B00] to-[#FF8533]",
    shadow: "shadow-[0_2px_8px_rgba(255,107,0,0.3)]",
    hoverShadow: "hover:shadow-[0_4px_16px_rgba(255,107,0,0.4)]",
    border: "border-[#FF8533]/30",
  },
  indicator: {
    gradient: "bg-gradient-to-r from-[#00B8D9] to-[#00D4FF]",
    shadow: "shadow-[0_2px_8px_rgba(0,184,217,0.3)]",
    hoverShadow: "hover:shadow-[0_4px_16px_rgba(0,184,217,0.4)]",
    border: "border-[#00D4FF]/30",
  },
  priceaction: {
    gradient: "bg-gradient-to-r from-[#F59E0B] to-[#FBBF24]",
    shadow: "shadow-[0_2px_8px_rgba(245,158,11,0.3)]",
    hoverShadow: "hover:shadow-[0_4px_16px_rgba(245,158,11,0.4)]",
    border: "border-[#FBBF24]/30",
  },
  entry: {
    gradient: "bg-gradient-to-r from-[#00C853] to-[#69F0AE]",
    shadow: "shadow-[0_2px_8px_rgba(0,200,83,0.3)]",
    hoverShadow: "hover:shadow-[0_4px_16px_rgba(0,200,83,0.4)]",
    border: "border-[#69F0AE]/30",
  },
  trading: {
    gradient: "bg-gradient-to-r from-[#00C853] to-[#69F0AE]",
    shadow: "shadow-[0_2px_8px_rgba(0,200,83,0.3)]",
    hoverShadow: "hover:shadow-[0_4px_16px_rgba(0,200,83,0.4)]",
    border: "border-[#69F0AE]/30",
  },
  riskmanagement: {
    gradient: "bg-gradient-to-r from-[#E11D48] to-[#FB7185]",
    shadow: "shadow-[0_2px_8px_rgba(225,29,72,0.3)]",
    hoverShadow: "hover:shadow-[0_4px_16px_rgba(225,29,72,0.4)]",
    border: "border-[#FB7185]/30",
  },
  trademanagement: {
    gradient: "bg-gradient-to-r from-[#7C3AED] to-[#A855F7]",
    shadow: "shadow-[0_2px_8px_rgba(168,85,247,0.3)]",
    hoverShadow: "hover:shadow-[0_4px_16px_rgba(168,85,247,0.4)]",
    border: "border-[#A855F7]/30",
  },
  entrystrategy: {
    gradient: "bg-gradient-to-r from-[#059669] to-[#10B981]",
    shadow: "shadow-[0_2px_8px_rgba(16,185,129,0.3)]",
    hoverShadow: "hover:shadow-[0_4px_16px_rgba(16,185,129,0.4)]",
    border: "border-[#10B981]/30",
  },
};

const BLOCK_COLORS: Record<NodeCategory, string> = {
  timing: "text-[#FF6B00]",
  indicator: "text-[#00B8D9]",
  priceaction: "text-[#F59E0B]",
  entry: "text-[#00C853]",
  trading: "text-[#00C853]",
  riskmanagement: "text-[#FB7185]",
  trademanagement: "text-[#A855F7]",
  entrystrategy: "text-[#10B981]",
};

const CATEGORIES: NodeCategory[] = ["entrystrategy", "timing", "trademanagement", "indicator"];

interface NodeToolbarProps {
  onDragStart: (event: React.DragEvent, template: NodeTemplate) => void;
  onClose?: () => void;
  settings?: BuildJsonSettings;
  onSettingsChange?: (settings: BuildJsonSettings) => void;
}

export function NodeToolbar({
  onDragStart,
  onClose,
  settings,
  onSettingsChange,
}: NodeToolbarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<NodeCategory>>(
    new Set(["entrystrategy"])
  );
  const [search, setSearch] = useState("");

  const toggleCategory = (category: NodeCategory) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) {
        next.delete(category);
      } else {
        next.add(category);
      }
      return next;
    });
  };

  return (
    <div
      className="w-[230px] h-full bg-[#1A0626] border-r border-[rgba(79,70,229,0.2)] flex flex-col flex-shrink-0"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-3 border-b border-[rgba(79,70,229,0.2)]">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-white">Blocks</h3>
            <p className="text-xs text-[#7C8DB0] mt-1">Drag to canvas</p>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="md:hidden p-1.5 text-[#94A3B8] hover:text-white transition-colors"
              title="Close"
              aria-label="Close blocks panel"
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
          )}
        </div>
        <div className="relative mt-2">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#7C8DB0]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPointerDown={(e) => e.stopPropagation()}
            placeholder="Search blocks..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#0F172A] border border-[rgba(79,70,229,0.2)] rounded-lg text-white placeholder-[#64748B] focus:outline-none focus:border-[#4F46E5] transition-colors"
          />
        </div>
      </div>

      <div className="p-2 space-y-2 flex-1 overflow-y-auto">
        {CATEGORIES.map((category) => {
          const searchLower = search.toLowerCase().trim();
          const templates = NODE_TEMPLATES.filter(
            (t) =>
              t.category === category &&
              (!searchLower ||
                t.label.toLowerCase().includes(searchLower) ||
                (t.description ?? "").toLowerCase().includes(searchLower))
          );
          if (searchLower && templates.length === 0) return null;
          const isExpanded = searchLower ? true : expandedCategories.has(category);
          const styles = CATEGORY_STYLES[category];

          return (
            <div key={category}>
              {/* Category Header - Professional Design */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategory(category);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className={`
                  w-full flex items-center justify-between px-4 py-3
                  text-white font-semibold text-sm tracking-wide
                  rounded-xl border
                  transition-all duration-200 ease-out
                  hover:scale-[1.02] active:scale-[0.98]
                  ${styles.gradient}
                  ${styles.shadow}
                  ${styles.hoverShadow}
                  ${styles.border}
                `}
                aria-expanded={isExpanded}
              >
                {/* Label */}
                <span className="whitespace-nowrap">{getCategoryLabel(category)}</span>

                {/* Chevron */}
                <svg
                  className={`w-4 h-4 opacity-80 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Block List */}
              {isExpanded && (
                <div className="mt-2 space-y-1 pl-1">
                  {templates.map((template, index) => {
                    const isBeginner =
                      template.type === "ema-crossover-entry" ||
                      template.type === "rsi-reversal-entry" ||
                      template.type === "range-breakout-entry" ||
                      template.type === "macd-crossover-entry";
                    const isIntermediate =
                      template.type === "trend-pullback-entry" ||
                      template.type === "divergence-entry";
                    return (
                      <div
                        key={`${template.type}-${index}`}
                        draggable
                        onDragStart={(e) => onDragStart(e, template)}
                        aria-label={`${template.label} block`}
                        className="px-3 py-2.5 rounded-lg bg-[#2A1438]/80 border border-[rgba(79,70,229,0.15)] transition-all duration-200 cursor-grab hover:border-[rgba(79,70,229,0.3)] hover:bg-[#2A1438] hover:shadow-[0_0_12px_rgba(79,70,229,0.1)] active:cursor-grabbing"
                        title={template.description}
                      >
                        <div className="flex items-center justify-between">
                          <div className={`text-sm font-medium ${BLOCK_COLORS[template.category]}`}>
                            {template.label}
                          </div>
                          {isBeginner && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[rgba(16,185,129,0.15)] text-[#10B981]">
                              Beginner
                            </span>
                          )}
                          {isIntermediate && (
                            <span className="text-[9px] font-medium px-1.5 py-0.5 rounded-full bg-[rgba(245,158,11,0.15)] text-[#F59E0B]">
                              Intermediate
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-[#94A3B8] truncate mt-0.5">
                          {template.description}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* Strategy Settings Panel */}
        {settings && onSettingsChange && (
          <>
            <div className="border-t border-[rgba(79,70,229,0.2)] mt-2 pt-2">
              <p className="text-[10px] text-[#64748B] mb-1 flex items-center gap-1">
                <svg
                  className="w-3 h-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
                Strategy Settings
              </p>
            </div>
            <StrategySettingsPanel settings={settings} onChange={onSettingsChange} />
          </>
        )}
      </div>
    </div>
  );
}
