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

interface NodeToolbarProps {
  onDragStart: (event: React.DragEvent, template: NodeTemplate) => void;
  isPro?: boolean;
  onClose?: () => void;
  settings?: BuildJsonSettings;
  onSettingsChange?: (settings: BuildJsonSettings) => void;
}

export function NodeToolbar({
  onDragStart,
  isPro = false,
  onClose,
  settings,
  onSettingsChange,
}: NodeToolbarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<NodeCategory>>(new Set());

  const categories: NodeCategory[] = [
    "timing",
    "indicator",
    "priceaction",
    "trading",
    "trademanagement",
  ];

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

  // Professional gradient and styling for each category
  const categoryStyles: Record<
    NodeCategory,
    {
      gradient: string;
      shadow: string;
      hoverShadow: string;
      border: string;
    }
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
    trading: {
      gradient: "bg-gradient-to-r from-[#00C853] to-[#69F0AE]",
      shadow: "shadow-[0_2px_8px_rgba(0,200,83,0.3)]",
      hoverShadow: "hover:shadow-[0_4px_16px_rgba(0,200,83,0.4)]",
      border: "border-[#69F0AE]/30",
    },
    trademanagement: {
      gradient: "bg-gradient-to-r from-[#7C3AED] to-[#A855F7]",
      shadow: "shadow-[0_2px_8px_rgba(168,85,247,0.3)]",
      hoverShadow: "hover:shadow-[0_4px_16px_rgba(168,85,247,0.4)]",
      border: "border-[#A855F7]/30",
    },
  };

  const blockColors: Record<NodeCategory, string> = {
    timing: "text-[#FF6B00]",
    indicator: "text-[#00B8D9]",
    priceaction: "text-[#F59E0B]",
    trading: "text-[#00C853]",
    trademanagement: "text-[#A855F7]",
  };

  return (
    <div
      className="w-[230px] h-full bg-[#1A0626] border-r border-[rgba(79,70,229,0.2)] flex flex-col flex-shrink-0"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="p-3 border-b border-[rgba(79,70,229,0.2)] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-white">Blocks</h3>
          <p className="text-xs text-[#64748B] mt-1">Drag to canvas</p>
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

      <div className="p-2 space-y-2 flex-1 overflow-y-auto">
        {categories.map((category) => {
          const templates = NODE_TEMPLATES.filter((t) => t.category === category);
          const isExpanded = expandedCategories.has(category);
          const styles = categoryStyles[category];

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
                    const isLocked = template.proOnly && !isPro;
                    const isComingSoon = template.comingSoon;
                    const isDisabled = isLocked || isComingSoon;

                    return (
                      <div
                        key={`${template.type}-${index}`}
                        draggable={!isDisabled}
                        onDragStart={(e) => {
                          if (isDisabled) {
                            e.preventDefault();
                            return;
                          }
                          onDragStart(e, template);
                        }}
                        aria-label={`${template.label} block`}
                        className={`px-3 py-2.5 rounded-lg bg-[#2A1438]/80 border border-[rgba(79,70,229,0.15)] transition-all duration-200 ${
                          isDisabled
                            ? "opacity-60 cursor-not-allowed"
                            : "cursor-grab hover:border-[rgba(79,70,229,0.3)] hover:bg-[#2A1438] hover:shadow-[0_0_12px_rgba(79,70,229,0.1)] active:cursor-grabbing"
                        }`}
                        title={
                          isComingSoon
                            ? "Coming soon"
                            : isLocked
                              ? "Upgrade to Starter or Pro to use this block"
                              : template.description
                        }
                      >
                        <div className="flex items-center justify-between">
                          <div className={`text-sm font-medium ${blockColors[template.category]}`}>
                            {template.label}
                          </div>
                          {isComingSoon && (
                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[rgba(100,116,139,0.3)] text-[#94A3B8]">
                              SOON
                            </span>
                          )}
                          {template.proOnly && !isComingSoon && (
                            <span
                              className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                                isPro
                                  ? "bg-[rgba(168,85,247,0.2)] text-[#A855F7]"
                                  : "bg-[rgba(168,85,247,0.3)] text-[#A855F7]"
                              }`}
                            >
                              {isLocked ? "🔒 STARTER+" : "STARTER+"}
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
      </div>

      {/* Strategy Settings Panel */}
      {settings && onSettingsChange && (
        <StrategySettingsPanel settings={settings} onChange={onSettingsChange} />
      )}
    </div>
  );
}
