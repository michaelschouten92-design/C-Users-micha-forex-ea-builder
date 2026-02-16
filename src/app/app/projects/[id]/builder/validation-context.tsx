"use client";
import { createContext, useContext } from "react";
import type { ValidationIssue } from "./strategy-validation";

const ValidationContext = createContext<Record<string, ValidationIssue[]>>({});

export const ValidationProvider = ValidationContext.Provider;

export function useNodeValidation(nodeId: string): ValidationIssue[] {
  const map = useContext(ValidationContext);
  return map[nodeId] ?? [];
}
