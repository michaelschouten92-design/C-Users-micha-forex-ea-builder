"use client";

import { useState } from "react";

type ProjectSummary = {
  id: string;
  name: string;
  description: string | null;
  buildJson: unknown;
};

type NodeInfo = {
  type: string;
  label: string;
  category: string;
};

type StrategySettings = {
  riskPercent?: number;
  slMethod?: string;
  slPips?: number;
  tpMethod?: string;
  tpRMultiple?: number;
  tpPips?: number;
  entryType?: string;
  lotSize?: number;
  timeframe?: string;
  maxOpenTrades?: number;
  maxTradesPerDay?: number;
  signalMode?: string;
  magicNumber?: number;
};

type BacktestMetrics = {
  profitFactor?: number;
  maxDrawdown?: number;
  totalTrades?: number;
  winRate?: number;
  netProfit?: number;
  sharpeRatio?: number;
};

function extractNodes(buildJson: unknown): NodeInfo[] {
  if (!buildJson || typeof buildJson !== "object") return [];
  const json = buildJson as { nodes?: { type?: string; data?: Record<string, unknown> }[] };
  if (!Array.isArray(json.nodes)) return [];

  return json.nodes.map((node) => ({
    type: node.type ?? "unknown",
    label: (node.data?.label as string) ?? node.type ?? "Unknown",
    category: (node.data?.category as string) ?? "other",
  }));
}

function extractStrategySettings(buildJson: unknown): StrategySettings {
  if (!buildJson || typeof buildJson !== "object") return {};
  const json = buildJson as {
    nodes?: { data?: Record<string, unknown> }[];
    settings?: Record<string, unknown>;
  };
  if (!Array.isArray(json.nodes)) return {};

  const settings: StrategySettings = {};

  // Extract from global settings
  if (json.settings) {
    if (typeof json.settings.maxOpenTrades === "number") {
      settings.maxOpenTrades = json.settings.maxOpenTrades;
    }
    if (typeof json.settings.maxTradesPerDay === "number") {
      settings.maxTradesPerDay = json.settings.maxTradesPerDay;
    }
    if (typeof json.settings.magicNumber === "number") {
      settings.magicNumber = json.settings.magicNumber;
    }
  }

  // Extract from node data
  for (const node of json.nodes) {
    if (!node.data) continue;
    const d = node.data;

    if (typeof d.entryType === "string") settings.entryType = d.entryType;
    if (typeof d.riskPercent === "number") settings.riskPercent = d.riskPercent;
    if (typeof d.slMethod === "string") settings.slMethod = d.slMethod;
    if (typeof d.slPips === "number") settings.slPips = d.slPips;
    if (typeof d.tpMethod === "string") settings.tpMethod = d.tpMethod;
    if (typeof d.tpRMultiple === "number") settings.tpRMultiple = d.tpRMultiple;
    if (typeof d.tpPips === "number") settings.tpPips = d.tpPips;
    if (typeof d.lotSize === "number") settings.lotSize = d.lotSize;
    if (typeof d.timeframe === "string") settings.timeframe = d.timeframe;
    if (typeof d.signalMode === "string") settings.signalMode = d.signalMode;
  }

  return settings;
}

function extractBacktestMetrics(buildJson: unknown): BacktestMetrics | null {
  if (!buildJson || typeof buildJson !== "object") return null;
  const json = buildJson as { backtestResults?: Record<string, unknown> };
  if (!json.backtestResults || typeof json.backtestResults !== "object") return null;
  const bt = json.backtestResults;

  return {
    profitFactor: typeof bt.profitFactor === "number" ? bt.profitFactor : undefined,
    maxDrawdown: typeof bt.maxDrawdown === "number" ? bt.maxDrawdown : undefined,
    totalTrades: typeof bt.totalTrades === "number" ? bt.totalTrades : undefined,
    winRate: typeof bt.winRate === "number" ? bt.winRate : undefined,
    netProfit: typeof bt.netProfit === "number" ? bt.netProfit : undefined,
    sharpeRatio: typeof bt.sharpeRatio === "number" ? bt.sharpeRatio : undefined,
  };
}

function groupNodesByCategory(nodes: NodeInfo[]): Record<string, NodeInfo[]> {
  const grouped: Record<string, NodeInfo[]> = {};
  for (const node of nodes) {
    const cat = node.category;
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(node);
  }
  return grouped;
}

function countByCategory(nodes: NodeInfo[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const node of nodes) {
    counts[node.category] = (counts[node.category] ?? 0) + 1;
  }
  return counts;
}

const CATEGORY_LABELS: Record<string, string> = {
  entrystrategy: "Entry Strategy",
  timing: "Timing",
  trademanagement: "Trade Management",
  indicator: "Indicator",
  trading: "Trading",
  filter: "Filter",
  other: "Other",
};

const CATEGORY_COLORS: Record<string, string> = {
  entrystrategy: "text-[#10B981]",
  timing: "text-[#F59E0B]",
  trademanagement: "text-[#A78BFA]",
  indicator: "text-[#22D3EE]",
  trading: "text-[#60A5FA]",
  filter: "text-[#F472B6]",
  other: "text-[#64748B]",
};

const CATEGORY_DOT_COLORS: Record<string, string> = {
  entrystrategy: "bg-[#10B981]",
  timing: "bg-[#F59E0B]",
  trademanagement: "bg-[#A78BFA]",
  indicator: "bg-[#22D3EE]",
  trading: "bg-[#60A5FA]",
  filter: "bg-[#F472B6]",
  other: "bg-[#64748B]",
};

function formatSettingValue(key: string, value: unknown): string {
  if (value === undefined || value === null) return "--";
  if (key === "slMethod" || key === "tpMethod") {
    return String(value)
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }
  if (key === "riskPercent") return `${value}%`;
  if (key === "tpRMultiple") return `${value}R`;
  if (key === "slPips" || key === "tpPips") return `${value} pips`;
  return String(value);
}

function SettingsRow({
  label,
  leftValue,
  rightValue,
}: {
  label: string;
  leftValue: string;
  rightValue: string;
}) {
  const isDifferent = leftValue !== rightValue && leftValue !== "--" && rightValue !== "--";

  return (
    <div
      className={`grid grid-cols-3 gap-2 py-1.5 px-2 rounded text-xs ${
        isDifferent ? "bg-[rgba(79,70,229,0.08)]" : ""
      }`}
    >
      <span className="text-[#7C8DB0] truncate">{label}</span>
      <span
        className={`text-center font-medium ${isDifferent ? "text-[#22D3EE]" : "text-[#CBD5E1]"}`}
      >
        {leftValue}
      </span>
      <span
        className={`text-center font-medium ${isDifferent ? "text-[#22D3EE]" : "text-[#CBD5E1]"}`}
      >
        {rightValue}
      </span>
    </div>
  );
}

function MetricRow({
  label,
  leftValue,
  rightValue,
  higherIsBetter,
}: {
  label: string;
  leftValue?: number;
  rightValue?: number;
  higherIsBetter: boolean;
}) {
  const leftStr = leftValue !== undefined ? leftValue.toFixed(2) : "--";
  const rightStr = rightValue !== undefined ? rightValue.toFixed(2) : "--";

  let leftHighlight = "text-[#CBD5E1]";
  let rightHighlight = "text-[#CBD5E1]";

  if (leftValue !== undefined && rightValue !== undefined) {
    if (higherIsBetter) {
      if (leftValue > rightValue) leftHighlight = "text-[#10B981] font-semibold";
      else if (rightValue > leftValue) rightHighlight = "text-[#10B981] font-semibold";
    } else {
      if (leftValue < rightValue) leftHighlight = "text-[#10B981] font-semibold";
      else if (rightValue < leftValue) rightHighlight = "text-[#10B981] font-semibold";
    }
  }

  return (
    <div className="grid grid-cols-3 gap-2 py-1.5 px-2 text-xs">
      <span className="text-[#7C8DB0] truncate">{label}</span>
      <span className={`text-center ${leftHighlight}`}>{leftStr}</span>
      <span className={`text-center ${rightHighlight}`}>{rightStr}</span>
    </div>
  );
}

function EmptyColumn() {
  return (
    <div className="flex-1 bg-[#1A0626] border border-dashed border-[rgba(79,70,229,0.3)] rounded-xl p-6 flex items-center justify-center min-h-[300px]">
      <p className="text-sm text-[#7C8DB0]">Select a project to compare</p>
    </div>
  );
}

function ProjectColumnContent({ project }: { project: ProjectSummary }) {
  const nodes = extractNodes(project.buildJson);
  const nodesByCategory = groupNodesByCategory(nodes);

  return (
    <div className="flex-1 bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
      <h3 className="font-semibold text-white text-lg mb-1 truncate" title={project.name}>
        {project.name}
      </h3>
      {project.description && (
        <p className="text-xs text-[#94A3B8] mb-4 line-clamp-2">{project.description}</p>
      )}

      {/* Node count summary */}
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.entries(countByCategory(nodes)).map(([cat, count]) => (
          <span
            key={cat}
            className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full bg-[rgba(79,70,229,0.1)] border border-[rgba(79,70,229,0.2)]"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${CATEGORY_DOT_COLORS[cat] ?? "bg-[#64748B]"}`}
            />
            <span className="text-[#CBD5E1]">
              {count} {CATEGORY_LABELS[cat] ?? cat}
            </span>
          </span>
        ))}
        <span className="text-xs text-[#7C8DB0]">({nodes.length} total)</span>
      </div>

      {/* Node Types */}
      <div>
        <h4 className="text-xs uppercase tracking-wider text-[#7C8DB0] font-medium mb-3">
          Strategy Blocks
        </h4>
        {nodes.length === 0 ? (
          <p className="text-xs text-[#64748B]">No blocks in this strategy</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(nodesByCategory).map(([category, categoryNodes]) => (
              <div key={category}>
                <p
                  className={`text-[10px] uppercase tracking-wider font-medium mb-1 ${CATEGORY_COLORS[category] ?? "text-[#64748B]"}`}
                >
                  {CATEGORY_LABELS[category] ?? category}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {categoryNodes.map((node, i) => (
                    <span
                      key={`${node.type}-${i}`}
                      className="text-xs px-2 py-0.5 rounded-full bg-[rgba(79,70,229,0.1)] text-[#CBD5E1] border border-[rgba(79,70,229,0.2)]"
                    >
                      {node.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectColumn({ project }: { project: ProjectSummary | null }) {
  if (!project) {
    return <EmptyColumn />;
  }
  return <ProjectColumnContent project={project} />;
}

export function CompareClient({ projects }: { projects: ProjectSummary[] }) {
  const [leftId, setLeftId] = useState<string>("");
  const [rightId, setRightId] = useState<string>("");

  const leftProject = projects.find((p) => p.id === leftId) ?? null;
  const rightProject = projects.find((p) => p.id === rightId) ?? null;

  if (projects.length < 2) {
    return (
      <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-12 text-center">
        <h3 className="text-lg font-semibold text-white mb-2">Not enough projects</h3>
        <p className="text-sm text-[#94A3B8]">
          You need at least two projects to compare strategies.
        </p>
      </div>
    );
  }

  const leftSettings = leftProject ? extractStrategySettings(leftProject.buildJson) : {};
  const rightSettings = rightProject ? extractStrategySettings(rightProject.buildJson) : {};
  const leftBacktest = leftProject ? extractBacktestMetrics(leftProject.buildJson) : null;
  const rightBacktest = rightProject ? extractBacktestMetrics(rightProject.buildJson) : null;
  const hasBacktest = leftBacktest !== null || rightBacktest !== null;

  // Build the list of settings keys to compare
  const settingsKeys: { key: keyof StrategySettings; label: string }[] = [
    { key: "entryType", label: "Entry Strategy" },
    { key: "riskPercent", label: "Risk %" },
    { key: "slMethod", label: "SL Method" },
    { key: "slPips", label: "SL Pips" },
    { key: "tpMethod", label: "TP Method" },
    { key: "tpRMultiple", label: "TP R-Multiple" },
    { key: "tpPips", label: "TP Pips" },
    { key: "signalMode", label: "Signal Mode" },
    { key: "timeframe", label: "Timeframe" },
    { key: "maxOpenTrades", label: "Max Open Trades" },
    { key: "maxTradesPerDay", label: "Max Trades/Day" },
  ];

  // Only show rows where at least one side has a value
  const visibleSettings = settingsKeys.filter(
    ({ key }) => leftSettings[key] !== undefined || rightSettings[key] !== undefined
  );

  return (
    <div>
      {/* Selectors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label
            htmlFor="left-project"
            className="block text-xs uppercase tracking-wider text-[#7C8DB0] font-medium mb-2"
          >
            Project A
          </label>
          <select
            id="left-project"
            value={leftId}
            onChange={(e) => setLeftId(e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-[#CBD5E1] focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200"
          >
            <option value="">Select a project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === rightId}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="right-project"
            className="block text-xs uppercase tracking-wider text-[#7C8DB0] font-medium mb-2"
          >
            Project B
          </label>
          <select
            id="right-project"
            value={rightId}
            onChange={(e) => setRightId(e.target.value)}
            className="w-full px-3 py-2.5 text-sm bg-[#1E293B] border border-[rgba(79,70,229,0.3)] rounded-lg text-[#CBD5E1] focus:ring-2 focus:ring-[#22D3EE] focus:border-transparent focus:outline-none transition-all duration-200"
          >
            <option value="">Select a project...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id} disabled={p.id === leftId}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Side-by-side strategy overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <ProjectColumn project={leftProject} />
        <ProjectColumn project={rightProject} />
      </div>

      {/* Settings comparison table */}
      {leftProject && rightProject && visibleSettings.length > 0 && (
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6 mb-6">
          <h3 className="text-sm font-semibold text-white mb-4">Settings Comparison</h3>
          <div className="grid grid-cols-3 gap-2 pb-2 mb-2 border-b border-[rgba(79,70,229,0.15)]">
            <span className="text-[10px] uppercase tracking-wider text-[#7C8DB0] font-medium">
              Setting
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[#7C8DB0] font-medium text-center truncate">
              {leftProject.name}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[#7C8DB0] font-medium text-center truncate">
              {rightProject.name}
            </span>
          </div>
          <div className="space-y-0.5">
            {visibleSettings.map(({ key, label }) => (
              <SettingsRow
                key={key}
                label={label}
                leftValue={formatSettingValue(key, leftSettings[key])}
                rightValue={formatSettingValue(key, rightSettings[key])}
              />
            ))}
          </div>
        </div>
      )}

      {/* Backtest metrics comparison */}
      {leftProject && rightProject && hasBacktest && (
        <div className="bg-[#1A0626] border border-[rgba(79,70,229,0.2)] rounded-xl p-6">
          <h3 className="text-sm font-semibold text-white mb-4">Backtest Comparison</h3>
          <div className="grid grid-cols-3 gap-2 pb-2 mb-2 border-b border-[rgba(79,70,229,0.15)]">
            <span className="text-[10px] uppercase tracking-wider text-[#7C8DB0] font-medium">
              Metric
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[#7C8DB0] font-medium text-center truncate">
              {leftProject.name}
            </span>
            <span className="text-[10px] uppercase tracking-wider text-[#7C8DB0] font-medium text-center truncate">
              {rightProject.name}
            </span>
          </div>
          <div className="space-y-0.5">
            <MetricRow
              label="Profit Factor"
              leftValue={leftBacktest?.profitFactor}
              rightValue={rightBacktest?.profitFactor}
              higherIsBetter={true}
            />
            <MetricRow
              label="Win Rate %"
              leftValue={leftBacktest?.winRate}
              rightValue={rightBacktest?.winRate}
              higherIsBetter={true}
            />
            <MetricRow
              label="Net Profit"
              leftValue={leftBacktest?.netProfit}
              rightValue={rightBacktest?.netProfit}
              higherIsBetter={true}
            />
            <MetricRow
              label="Total Trades"
              leftValue={leftBacktest?.totalTrades}
              rightValue={rightBacktest?.totalTrades}
              higherIsBetter={true}
            />
            <MetricRow
              label="Max Drawdown %"
              leftValue={leftBacktest?.maxDrawdown}
              rightValue={rightBacktest?.maxDrawdown}
              higherIsBetter={false}
            />
            <MetricRow
              label="Sharpe Ratio"
              leftValue={leftBacktest?.sharpeRatio}
              rightValue={rightBacktest?.sharpeRatio}
              higherIsBetter={true}
            />
          </div>
        </div>
      )}

      {/* No projects selected prompt */}
      {!leftProject && !rightProject && (
        <div className="text-center py-12">
          <p className="text-sm text-[#7C8DB0]">
            Select two projects above to compare their strategies side by side.
          </p>
        </div>
      )}
    </div>
  );
}
