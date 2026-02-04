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
    new Set()
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
    timing: { color: "text-white", bg: "bg-[#FF6B00]" },
    indicator: { color: "text-white", bg: "bg-[#00B8D9]" },
    condition: { color: "text-white", bg: "bg-[#9C27B0]" },
    trading: { color: "text-white", bg: "bg-[#00C853]" },
  };

  const blockColors: Record<NodeCategory, string> = {
    timing: "text-[#FF6B00]",
    indicator: "text-[#00B8D9]",
    condition: "text-[#9C27B0]",
    trading: "text-[#00C853]",
  };

  return (
    <div
      className="w-[200px] h-full bg-[#1A0626] border-r border-[rgba(79,70,229,0.2)] overflow-y-auto flex-shrink-0"
      onMouseDown={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
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
                onClick={(e) => {
                  e.stopPropagation();
                  toggleCategory(category);
                }}
                onMouseDown={(e) => e.stopPropagation()}
                onPointerDown={(e) => e.stopPropagation()}
                className={`w-full flex items-center justify-between px-4 py-4 text-lg font-bold text-white rounded-lg transition-all duration-200 hover:opacity-90 ${categoryStyles[category].bg}`}
              >
                <span>
                  {getCategoryLabel(category)}
                </span>
                <svg
                  className={`w-5 h-5 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="white"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
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
                      className="px-3 py-2.5 rounded-lg bg-[#2A1438] border border-[rgba(79,70,229,0.2)] cursor-grab hover:border-[rgba(79,70,229,0.4)] hover:shadow-[0_0_12px_rgba(79,70,229,0.15)] active:cursor-grabbing transition-all duration-200"
                    >
                      <div className={`text-sm font-medium ${blockColors[template.category]}`}>
                        {template.label}
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
      </div>
    </div>
  );
}
