"use client";

import { useState } from "react";
import { getCsrfHeaders } from "@/lib/api-client";
import { showSuccess, showError } from "@/lib/toast";

interface StrategyActionsProps {
  instanceId: string;
  eaName: string;
  tradingState: string;
  /** Open incidents that can be acknowledged */
  openIncidentIds: string[];
}

export function StrategyActions({
  instanceId,
  eaName,
  tradingState: initialState,
  openIncidentIds,
}: StrategyActionsProps) {
  const [tradingState, setTradingState] = useState(initialState);
  const [pauseLoading, setPauseLoading] = useState(false);
  const [ackLoading, setAckLoading] = useState(false);
  const [ackedIds, setAckedIds] = useState<Set<string>>(new Set());

  const isPaused = tradingState === "PAUSED";
  const unackedCount = openIncidentIds.filter((id) => !ackedIds.has(id)).length;

  async function handleTogglePause() {
    setPauseLoading(true);
    const newState = isPaused ? "TRADING" : "PAUSED";
    try {
      const res = await fetch(`/api/live/${instanceId}/pause`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...getCsrfHeaders() },
        body: JSON.stringify({ tradingState: newState }),
      });
      if (res.ok) {
        setTradingState(newState);
        showSuccess(`${eaName} ${newState === "PAUSED" ? "paused" : "resumed"}`);
      } else {
        showError("Failed to update trading state");
      }
    } catch {
      showError("Failed to update trading state");
    } finally {
      setPauseLoading(false);
    }
  }

  async function handleAcknowledgeAll() {
    setAckLoading(true);
    try {
      const ids = openIncidentIds.filter((id) => !ackedIds.has(id));
      await Promise.all(
        ids.map((id) =>
          fetch(`/api/alerts/${id}/acknowledge`, {
            method: "POST",
            headers: getCsrfHeaders(),
          })
        )
      );
      setAckedIds(new Set([...ackedIds, ...ids]));
      showSuccess("Incidents acknowledged");
    } catch {
      showError("Failed to acknowledge incidents");
    } finally {
      setAckLoading(false);
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center gap-2">
      {/* Pause / Resume */}
      <button
        onClick={handleTogglePause}
        disabled={pauseLoading}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
          isPaused
            ? "bg-[#10B981]/15 text-[#10B981] border border-[#10B981]/25 hover:bg-[#10B981]/25"
            : "bg-[#F59E0B]/15 text-[#F59E0B] border border-[#F59E0B]/25 hover:bg-[#F59E0B]/25"
        }`}
      >
        {pauseLoading ? (
          "..."
        ) : isPaused ? (
          <>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
              />
            </svg>
            Resume Strategy
          </>
        ) : (
          <>
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Pause Strategy
          </>
        )}
      </button>

      {/* Acknowledge Incidents */}
      {unackedCount > 0 && (
        <button
          onClick={handleAcknowledgeAll}
          disabled={ackLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-[#818CF8]/15 text-[#818CF8] border border-[#818CF8]/25 hover:bg-[#818CF8]/25 transition-colors disabled:opacity-50"
        >
          {ackLoading ? (
            "..."
          ) : (
            <>
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Acknowledge {unackedCount} {unackedCount === 1 ? "incident" : "incidents"}
            </>
          )}
        </button>
      )}
    </div>
  );
}
