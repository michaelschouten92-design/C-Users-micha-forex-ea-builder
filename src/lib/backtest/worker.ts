/**
 * Web Worker entry point for the backtesting engine.
 * Runs the simulation off the main thread for zero UI blocking.
 */

import type { WorkerInMessage, WorkerOutMessage } from "./types";
import type { BacktestConfig } from "./types";
import type { BuildJsonSchema } from "@/types/builder";
import { runBacktest } from "./engine";

// Worker message handler
self.onmessage = (event: MessageEvent<WorkerInMessage>) => {
  const msg = event.data;

  if (msg.type === "start") {
    try {
      const result = runBacktest(
        msg.bars,
        msg.buildJson as BuildJsonSchema,
        msg.config as BacktestConfig,
        (percent, barsProcessed, totalBars) => {
          const progress: WorkerOutMessage = {
            type: "progress",
            percent,
            barsProcessed,
            totalBars,
          };
          self.postMessage(progress);
        }
      );

      const resultMsg: WorkerOutMessage = {
        type: "result",
        result,
      };
      self.postMessage(resultMsg);
    } catch (err) {
      const errorMsg: WorkerOutMessage = {
        type: "error",
        error: err instanceof Error ? err.message : String(err),
      };
      self.postMessage(errorMsg);
    }
  }
};
