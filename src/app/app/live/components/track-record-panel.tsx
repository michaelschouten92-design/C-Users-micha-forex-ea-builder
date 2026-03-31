"use client";

import { useState, useEffect } from "react";
import { showSuccess, showError } from "@/lib/toast";
import { ShareTrackRecordButton } from "@/components/app/share-track-record-button";
import { formatMetricsDuration } from "./utils";

interface TrackRecordVerification {
  instanceId: string;
  eaName: string;
  mode: string;
  chain: {
    valid: boolean;
    length: number;
    firstEventHash: string | null;
    lastEventHash: string | null;
    error?: string;
  };
  checkpoints: {
    count: number;
    lastHmac: string | null;
    verified: boolean;
  };
  verified: boolean;
}

interface TrackRecordMetricsData {
  sharpeRatio: number;
  sortinoRatio: number;
  calmarRatio: number;
  profitFactor: number;
  drawdownDuration: number;
}

export function TrackRecordPanel({ instanceId, eaName }: { instanceId: string; eaName: string }) {
  const [data, setData] = useState<TrackRecordVerification | null>(null);
  const [metrics, setMetrics] = useState<TrackRecordMetricsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [verifyRes, metricsRes] = await Promise.all([
          fetch(`/api/track-record/verify?instanceId=${instanceId}`),
          fetch(`/api/track-record/metrics/${instanceId}`),
        ]);
        if (!cancelled) {
          if (verifyRes.ok) {
            setData(await verifyRes.json());
          } else {
            setError("Failed to load track record.");
          }
          if (metricsRes.ok) {
            setMetrics(await metricsRes.json());
          }
        }
      } catch {
        if (!cancelled) setError("Network error loading track record.");
      }
      if (!cancelled) setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [instanceId]);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/track-record/export/${instanceId}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `track-record-${eaName.replace(/[^a-zA-Z0-9]/g, "_")}.json`;
        a.click();
        setTimeout(() => URL.revokeObjectURL(url), 150);
        showSuccess("Track record exported");
      } else {
        showError("Export failed", "Could not generate track record export.");
      }
    } catch {
      showError("Export failed");
    }
    setExporting(false);
  }

  if (loading) {
    return (
      <div className="mt-4 pt-4 border-t border-[rgba(79,70,229,0.15)]">
        <div className="flex items-center gap-2 text-xs text-[#7C8DB0]">
          <div className="w-3 h-3 border-2 border-[#7C8DB0] border-t-transparent rounded-full animate-spin" />
          Loading track record...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="mt-4 pt-4 border-t border-[rgba(79,70,229,0.15)]">
        <p className="text-xs text-[#EF4444]">{error}</p>
      </div>
    );
  }

  if (!data || data.chain.length === 0) {
    return (
      <div className="mt-4 pt-4 border-t border-[rgba(79,70,229,0.15)]">
        <p className="text-xs text-[#7C8DB0]">
          No track record events yet. Events will appear once the EA starts sending data.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-[rgba(79,70,229,0.15)]">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
            Verified Track Record
          </h4>
          {data.verified ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#10B981]/20 text-[#10B981] border border-[#10B981]/30">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Chain Verified
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-full bg-[#EF4444]/20 text-[#EF4444] border border-[#EF4444]/30">
              <svg className="w-2.5 h-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={3}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              Chain Broken
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ShareTrackRecordButton instanceId={instanceId} />
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/30 hover:bg-[#22D3EE]/30 transition-all duration-200 disabled:opacity-50"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            {exporting ? "Exporting..." : "Export Record"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#0A0118]/50 rounded-lg p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Chain Length</p>
          <p className="text-sm font-medium text-[#CBD5E1]">{data.chain.length.toLocaleString()}</p>
        </div>
        <div className="bg-[#0A0118]/50 rounded-lg p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Checkpoints</p>
          <p className="text-sm font-medium text-[#CBD5E1]">{data.checkpoints.count}</p>
        </div>
        <div className="bg-[#0A0118]/50 rounded-lg p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">HMAC Status</p>
          <p
            className={`text-sm font-medium ${data.checkpoints.verified ? "text-[#10B981]" : data.checkpoints.count === 0 ? "text-[#7C8DB0]" : "text-[#EF4444]"}`}
          >
            {data.checkpoints.count === 0 ? "N/A" : data.checkpoints.verified ? "Valid" : "Invalid"}
          </p>
        </div>
        <div className="bg-[#0A0118]/50 rounded-lg p-2.5">
          <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Integrity</p>
          <p
            className={`text-sm font-medium ${data.verified ? "text-[#10B981]" : "text-[#EF4444]"}`}
          >
            {data.verified ? "Self-Reported, Verified" : "Unverified"}
          </p>
        </div>
      </div>

      {/* Risk Metrics */}
      {metrics && (metrics.sharpeRatio !== 0 || metrics.sortinoRatio !== 0) && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-3">
          <div className="bg-[#0A0118]/50 rounded-lg p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Sharpe</p>
            <p className="text-sm font-medium text-[#CBD5E1]">{metrics.sharpeRatio.toFixed(2)}</p>
          </div>
          <div className="bg-[#0A0118]/50 rounded-lg p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Sortino</p>
            <p className="text-sm font-medium text-[#CBD5E1]">{metrics.sortinoRatio.toFixed(2)}</p>
          </div>
          <div className="bg-[#0A0118]/50 rounded-lg p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">Calmar</p>
            <p className="text-sm font-medium text-[#CBD5E1]">{metrics.calmarRatio.toFixed(2)}</p>
          </div>
          <div className="bg-[#0A0118]/50 rounded-lg p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
              Profit Factor
            </p>
            <p className="text-sm font-medium text-[#CBD5E1]">
              {metrics.profitFactor === Infinity ? "\u221E" : metrics.profitFactor.toFixed(2)}
            </p>
          </div>
          <div className="bg-[#0A0118]/50 rounded-lg p-2.5">
            <p className="text-[10px] uppercase tracking-wider text-[#7C8DB0] mb-0.5">
              Max DD Duration
            </p>
            <p className="text-sm font-medium text-[#CBD5E1]">
              {formatMetricsDuration(metrics.drawdownDuration)}
            </p>
          </div>
        </div>
      )}

      {data.chain.error && (
        <div className="mt-2 px-3 py-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20">
          <p className="text-xs text-[#EF4444]">{data.chain.error}</p>
        </div>
      )}

      {data.chain.lastEventHash && (
        <div
          className="mt-2 text-[10px] text-[#7C8DB0] font-mono truncate"
          title={data.chain.lastEventHash}
        >
          Last hash: {data.chain.lastEventHash}
        </div>
      )}
    </div>
  );
}
