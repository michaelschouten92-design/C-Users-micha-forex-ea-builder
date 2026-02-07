import type { BuilderNode } from "@/types/builder";
import type { OptimizableInput, GeneratedCode } from "../types";

export function sanitizeName(name: string): string {
  return name.replace(/[^a-zA-Z0-9_]/g, "_").substring(0, 30);
}

/** Escape a string for safe interpolation inside an MQL5 string literal ("..."). */
export function sanitizeMQL5String(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/"/g, '\\"')
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "\\r")
    .replace(/\t/g, "\\t");
}

// Helper function to check if a field is optimizable for a node
export function isFieldOptimizable(node: BuilderNode, fieldName: string): boolean {
  const optimizableFields = node.data.optimizableFields;
  if (!optimizableFields || !Array.isArray(optimizableFields)) {
    return true; // Default to optimizable if not specified
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
  group?: string
): OptimizableInput {
  return {
    name,
    type,
    value,
    comment,
    isOptimizable: isFieldOptimizable(node, fieldName),
    group,
  };
}

export type { GeneratedCode };
