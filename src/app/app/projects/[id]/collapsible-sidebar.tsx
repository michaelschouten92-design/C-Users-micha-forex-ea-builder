"use client";

import { useState } from "react";

interface CollapsibleSidebarProps {
  children: React.ReactNode;
  projectName: string;
}

export function CollapsibleSidebar({ children, projectName }: CollapsibleSidebarProps) {
  // Default to collapsed (project info hidden by default)
  const [collapsed, setCollapsed] = useState(true);

  return (
    <div className={`relative flex-shrink-0 transition-all duration-300 ${collapsed ? 'w-0' : 'w-72'}`}>
      {/* Toggle button with project name - top edge at 50% */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`absolute top-1/2 -left-10 z-10 bg-gradient-to-r from-[#4F46E5] to-[#7C3AED] border border-[rgba(124,58,237,0.5)] border-t-0 rounded-bl-xl flex items-center gap-2 text-white hover:from-[#6366F1] hover:to-[#8B5CF6] hover:shadow-[0_0_20px_rgba(124,58,237,0.4)] transition-all duration-200 ${collapsed ? 'px-3 py-4' : 'px-2 py-3'}`}
        title={collapsed ? "Show project info" : "Hide project info"}
      >
        {collapsed && (
          <span
            className="text-xs font-semibold whitespace-nowrap max-w-[120px] truncate"
            style={{ writingMode: 'vertical-rl', textOrientation: 'mixed', transform: 'rotate(180deg)' }}
          >
            {projectName}
          </span>
        )}
        <svg
          className={`w-4 h-4 flex-shrink-0 transition-transform duration-200 ${collapsed ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </button>

      {/* Sidebar content */}
      {!collapsed && (
        <div className="w-72 h-full bg-[#1A0626] border-l border-[rgba(79,70,229,0.2)] overflow-y-auto">
          <div className="p-4 space-y-4">
            {children}
          </div>
        </div>
      )}
    </div>
  );
}
