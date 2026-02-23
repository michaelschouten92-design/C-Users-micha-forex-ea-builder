import type { BuilderNode } from "@/types/builder";
import type { OptimizableInput, GeneratedCode } from "../types";

export function sanitizeName(name: string): string {
  // MQL5 allows identifiers up to 63 characters
  return name.replace(/[^a-zA-Z0-9_]/g, "_").substring(0, 63);
}

/** Escape a string for safe interpolation inside an MQL5 string literal ("..."). */
export function sanitizeMQL5String(value: string): string {
  return (
    value
      .substring(0, 2000)
      // Strip null bytes and other control characters (U+0000-U+001F except \n \r \t)

      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "")
      .replace(/\\/g, "\\\\")
      .replace(/"/g, '\\"')
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t")
  );
}

// Helper function to check if a field is optimizable for a node
export function isFieldOptimizable(node: BuilderNode, fieldName: string): boolean {
  const optimizableFields = node.data.optimizableFields;
  if (!optimizableFields || !Array.isArray(optimizableFields)) {
    return false; // Default: NOT optimizable — only explicitly marked fields become input
  }
  return optimizableFields.includes(fieldName);
}

// Helper function to create an OptimizableInput
export function createInput(
  node: BuilderNode,
  fieldName: string,
  name: string,
  type: OptimizableInput["type"],
  value: number | string | boolean,
  comment: string,
  group?: string,
  alwaysVisible?: boolean
): OptimizableInput {
  // Coerce undefined/null/NaN to safe defaults to prevent invalid MQL5 like `input int X = NaN;`
  let safeValue: number | string | boolean = value;
  if (safeValue === undefined || safeValue === null) {
    safeValue = type === "string" ? "" : type === "bool" ? false : 0;
  }
  if (typeof safeValue === "number" && isNaN(safeValue)) {
    safeValue = 0;
  }
  return {
    name,
    type,
    value: safeValue,
    comment,
    isOptimizable: isFieldOptimizable(node, fieldName),
    group,
    alwaysVisible,
  };
}

export type { GeneratedCode };
