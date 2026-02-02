"use client";

import { useState } from "react";
import {
  NODE_TEMPLATES,
  getCategoryLabel,
  type NodeCategory,
  type NodeTemplate,
} from "@/types/builder";

interface NodeToolbarProps {
  onDragStart: (event: React.DragEvent, template: NodeTemplate) => void;
}

export function NodeToolbar({ onDragStart }: NodeToolbarProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<NodeCategory>>(
    new Set(["timing", "indicator", "condition", "trading"])
  );

  const categories: NodeCategory[] = ["timing", "indicator", "condition", "trading"];

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

  const categoryStyles: Record<NodeCategory, { color: string; bg: string }> = {
    timing: { color: "text-[#FB923C]", bg: "bg-[rgba(251,146,60,0.1)]" },
    indicator: { color: "text-[#22D3EE]", bg: "bg-[rgba(34,211,238,0.1)]" },
    condition: { color: "text-[#A78BFA]", bg: "bg-[rgba(167,139,250,0.1)]" },
    trading: { color: "text-[#10B981]", bg: "bg-[rgba(16,185,129,0.1)]" },
  };

  return (
    <div className="w-[200px] h-full bg-[#1A0626] border-r border-[rgba(79,70,229,0.2)] overflow-y-auto flex-shrink-0">
      <div className="p-3 border-b border-[rgba(79,70,229,0.2)]">
        <h3 className="text-sm font-semibold text-white">Blocks</h3>
        <p className="text-xs text-[#64748B] mt-1">Drag to canvas</p>
      </div>

      <div className="p-2">
        {categories.map((category) => {
          const templates = NODE_TEMPLATES.filter((t) => t.category === category);
          const isExpanded = expandedCategories.has(category);

          return (
            <div key={category} className="mb-2">
              {/* Category Header */}
              <button
                onClick={() => toggleCategory(category)}
                className="w-full flex items-center justify-between px-2 py-2 text-xs font-medium text-[#CBD5E1] hover:bg-[rgba(79,70,229,0.1)] rounded-lg transition-all duration-200"
              >
                <span className={categoryStyles[category].color}>
                  {getCategoryLabel(category)}
                </span>
                <svg
                  className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Block List */}
              {isExpanded && (
                <div className="mt-1 space-y-1">
                  {templates.map((template, index) => (
                    <div
                      key={`${template.type}-${index}`}
                      draggable
                      onDragStart={(e) => onDragStart(e, template)}
                      className={`px-3 py-2.5 rounded-lg border border-[rgba(79,70,229,0.2)] cursor-grab hover:border-[rgba(79,70,229,0.4)] hover:shadow-[0_0_12px_rgba(79,70,229,0.15)] active:cursor-grabbing transition-all duration-200 ${categoryStyles[template.category].bg}`}
                    >
                      <div className={`text-sm font-medium ${categoryStyles[template.category].color}`}>
                        {template.label}
                      </div>
                      <div className="text-xs text-[#64748B] truncate mt-0.5">
                        {template.description}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
