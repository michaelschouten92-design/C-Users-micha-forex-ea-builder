/**
 * Promise-based wrapper around the backtest Web Worker.
 * Provides a clean API for starting backtests and receiving progress/results.
 */

import type {
  OHLCVBar,
  BacktestConfig,
  BacktestEngineResult,
  WorkerInMessage,
  WorkerOutMessage,
} from "./types";
import type { BuildJsonSchema } from "@/types/builder";

export interface BacktestProgress {
  percent: number;
  barsProcessed: number;
  totalBars: number;
}

/**
 * Run a backtest in a Web Worker.
 * Returns a promise that resolves with the backtest result.
 */
export function runBacktestInWorker(
  bars: OHLCVBar[],
  buildJson: BuildJsonSchema,
  config: BacktestConfig,
  onProgress?: (progress: BacktestProgress) => void
): { promise: Promise<BacktestEngineResult>; cancel: () => void } {
  let worker: Worker | null = null;
  let cancelled = false;

  const promise = new Promise<BacktestEngineResult>((resolve, reject) => {
    try {
      worker = new Worker(new URL("./worker.ts", import.meta.url), { type: "module" });
    } catch {
      // Fallback: run synchronously on main thread
      import("./engine").then(({ runBacktest }) => {
        try {
          const result = runBacktest(
            bars,
            buildJson,
            config,
            (percent, barsProcessed, totalBars) => {
              onProgress?.({ percent, barsProcessed, totalBars });
            }
          );
          resolve(result);
        } catch (err) {
          reject(err);
        }
      });
      return;
    }

    worker.onmessage = (event: MessageEvent<WorkerOutMessage>) => {
      if (cancelled) return;

      const msg = event.data;
      switch (msg.type) {
        case "progress":
          onProgress?.({
            percent: msg.percent,
            barsProcessed: msg.barsProcessed,
            totalBars: msg.totalBars,
          });
          break;
        case "result":
          worker?.terminate();
          resolve(msg.result);
          break;
        case "error":
          worker?.terminate();
          reject(new Error(msg.error));
          break;
      }
    };

    worker.onerror = (err) => {
      worker?.terminate();
      reject(new Error(err.message || "Worker error"));
    };

    // Start the backtest
    const startMsg: WorkerInMessage = {
      type: "start",
      bars,
      buildJson,
      config,
    };
    worker.postMessage(startMsg);
  });

  const cancel = () => {
    cancelled = true;
    worker?.terminate();
  };

  return { promise, cancel };
}
