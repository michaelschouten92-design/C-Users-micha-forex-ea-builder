"use client";

import { Handle, Position, useReactFlow } from "@xyflow/react";
import type { NodeCategory } from "@/types/builder";

interface BaseNodeProps {
  id: string;
  selected?: boolean;
  category: NodeCategory;
  label: string;
  icon: React.ReactNode;
  children?: React.ReactNode;
  inputHandles?: number;
  outputHandles?: number;
}

const categoryStyles: Record<NodeCategory, { bg: string; border: string; header: string; glow: string }> = {
  timing: {
    bg: "bg-[rgba(251,146,60,0.08)]",
    border: "border-[rgba(251,146,60,0.3)]",
    header: "bg-gradient-to-r from-[#EA580C] to-[#FB923C]",
    glow: "shadow-[0_0_16px_rgba(251,146,60,0.25)]",
  },
  indicator: {
    bg: "bg-[rgba(34,211,238,0.08)]",
    border: "border-[rgba(34,211,238,0.3)]",
    header: "bg-gradient-to-r from-[#0891B2] to-[#22D3EE]",
    glow: "shadow-[0_0_16px_rgba(34,211,238,0.25)]",
  },
  condition: {
    bg: "bg-[rgba(167,139,250,0.08)]",
    border: "border-[rgba(167,139,250,0.3)]",
    header: "bg-gradient-to-r from-[#7C3AED] to-[#A78BFA]",
    glow: "shadow-[0_0_16px_rgba(167,139,250,0.25)]",
  },
  trading: {
    bg: "bg-[rgba(16,185,129,0.08)]",
    border: "border-[rgba(16,185,129,0.3)]",
    header: "bg-gradient-to-r from-[#059669] to-[#10B981]",
    glow: "shadow-[0_0_16px_rgba(16,185,129,0.25)]",
  },
};

export function BaseNode({
  id,
  selected,
  category,
  label,
  icon,
  children,
  inputHandles = 1,
  outputHandles = 1,
}: BaseNodeProps) {
  const styles = categoryStyles[category];
  const { deleteElements } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <div
      className={`
        min-w-[180px] rounded-xl border-2 relative transition-all duration-200 group
        ${styles.bg} ${styles.border}
        ${selected ? `ring-2 ring-[#22D3EE] ring-offset-2 ring-offset-[#0F172A] ${styles.glow}` : "shadow-[0_4px_12px_rgba(0,0,0,0.3)]"}
        hover:${styles.glow}
      `}
    >
      {/* Delete button - visible on hover or when selected */}
      <button
        onClick={handleDelete}
        className={`absolute -top-2 -right-2 w-6 h-6 bg-[#EF4444] hover:bg-[#DC2626] text-white rounded-full flex items-center justify-center shadow-lg transition-all duration-200 z-10 ${selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
        title="Delete block (Delete key)"
      >
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Input Handle - TOP */}
      {inputHandles > 0 && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-[#4F46E5] !border-2 !border-[#0F172A] hover:!bg-[#22D3EE] transition-colors duration-200"
        />
      )}

      {/* Header */}
      <div className={`${styles.header} px-3 py-2 rounded-t-[10px] flex items-center gap-2`}>
        <span className="text-white">{icon}</span>
        <span className="text-white text-sm font-medium truncate flex-1">{label}</span>
      </div>

      {/* Content */}
      {children && (
        <div className="px-3 py-2 text-xs text-[#CBD5E1]">
          {children}
        </div>
      )}

      {/* Output Handle - BOTTOM */}
      {outputHandles > 0 && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-[#4F46E5] !border-2 !border-[#0F172A] hover:!bg-[#22D3EE] transition-colors duration-200"
        />
      )}
    </div>
  );
}

// Icons for different node types
export const NodeIcons = {
  timing: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  indicator: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  condition: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  trading: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  entry: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
    </svg>
  ),
  exit: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  ),
  stopLoss: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
    </svg>
  ),
  takeProfit: (
    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};
