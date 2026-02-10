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
  const [searchQuery, setSearchQuery] = useState("");

  const categories: NodeCategory[] = ["entrystrategy", "timing", "trademanagement"];

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

  const blockColors: Record<NodeCategory, string> = {
    timing: "text-[#FF6B00]",
    indicator: "text-[#00B8D9]",
    priceaction: "text-[#F59E0B]",
    entry: "text-[#00C853]",
    trading: "text-[#00C853]",
    riskmanagement: "text-[#FB7185]",
    trademanagement: "text-[#A855F7]",
    entrystrategy: "text-[#10B981]",
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

      {/* Search */}
      <div className="px-2 pt-2">
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#64748B] pointer-events-none"
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
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search blocks..."
            className="w-full pl-8 pr-3 py-1.5 text-xs bg-[#1E293B] border border-[rgba(79,70,229,0.2)] rounded-lg text-white placeholder-[#64748B] focus:ring-1 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all"
          />
        </div>
      </div>

      <div className="p-2 space-y-2 flex-1 overflow-y-auto">
        {categories.map((category) => {
          const allTemplates = NODE_TEMPLATES.filter((t) => t.category === category);
          const templates = searchQuery
            ? allTemplates.filter(
                (t) =>
                  t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
                  t.description.toLowerCase().includes(searchQuery.toLowerCase())
              )
            : allTemplates;
          if (searchQuery && templates.length === 0) return null;
          const isExpanded = searchQuery ? true : expandedCategories.has(category);
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
                  {templates.map((template, index) => (
                    <div
                      key={`${template.type}-${index}`}
                      draggable
                      onDragStart={(e) => onDragStart(e, template)}
                      aria-label={`${template.label} block`}
                      className="px-3 py-2.5 rounded-lg bg-[#2A1438]/80 border border-[rgba(79,70,229,0.15)] transition-all duration-200 cursor-grab hover:border-[rgba(79,70,229,0.3)] hover:bg-[#2A1438] hover:shadow-[0_0_12px_rgba(79,70,229,0.1)] active:cursor-grabbing"
                      title={template.description}
                    >
                      <div className="flex items-center justify-between">
                        <div className={`text-sm font-medium ${blockColors[template.category]}`}>
                          {template.label}
                        </div>
                      </div>
                      <div className="text-xs text-[#94A3B8] truncate mt-0.5">
                        {template.description}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Strategy Settings Panel */}
        {settings && onSettingsChange && (
          <StrategySettingsPanel settings={settings} onChange={onSettingsChange} />
        )}
      </div>
    </div>
  );
}
