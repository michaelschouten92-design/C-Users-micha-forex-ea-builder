import DOMPurify from "isomorphic-dompurify";

/**
 * Input sanitization utilities for XSS prevention.
 *
 * Use these functions to sanitize user input before storing in the database
 * or rendering in the UI.
 */

/**
 * Sanitize HTML content - removes all dangerous tags and attributes
 * Use for rich text fields that may contain HTML
 */
export function sanitizeHtml(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: ["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"],
    ALLOWED_ATTR: ["href", "target", "rel"],
  });
}

/**
 * Sanitize plain text - strips ALL HTML tags
 * Use for text fields like names, descriptions, comments
 */
export function sanitizeText(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // No HTML tags allowed
    ALLOWED_ATTR: [],
  });
}

/**
 * Sanitize and trim text input
 * Common utility for form fields
 */
export function sanitizeInput(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return sanitizeText(trimmed);
}

/**
 * Sanitize object values recursively
 * Useful for sanitizing form data objects
 */
export function sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      result[key] = sanitizeText(value);
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      result[key] = sanitizeObject(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }

  return result as T;
}

/**
 * Check if a string contains potentially dangerous content
 * Returns true if the string contains HTML/script tags
 */
export function containsHtml(input: string): boolean {
  const htmlPattern = /<[^>]*>/;
  return htmlPattern.test(input);
}

/**
 * Escape HTML entities for safe display
 * Use when you need to display user input as plain text
 */
export function escapeHtml(input: string): string {
  const escapeMap: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  };
  return input.replace(/[&<>"']/g, (char) => escapeMap[char]);
}
