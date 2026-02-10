/**
 * Input sanitization utilities for XSS prevention.
 *
 * Use these functions to sanitize user input before storing in the database
 * or rendering in the UI.
 *
 * Note: React automatically escapes text in JSX, so these are primarily
 * for defense-in-depth when storing user input.
 */

/**
 * Sanitize HTML content - removes all dangerous tags and attributes.
 * Only allows a small set of safe formatting tags.
 */
export function sanitizeHtml(input: string): string {
  const allowedTags = new Set(["b", "i", "em", "strong", "a", "p", "br", "ul", "ol", "li"]);
  const allowedAttrs = new Set(["href", "target", "rel"]);

  // Strip all tags except allowed ones, and strip disallowed attributes
  return input
    .replace(/<!--[\s\S]*?-->/g, "") // Remove HTML comments
    .replace(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>/g, (match, tag, attrs) => {
      const lowerTag = tag.toLowerCase();
      if (!allowedTags.has(lowerTag)) return "";

      // Filter attributes
      const safeAttrs =
        (attrs as string)
          .match(/\s+([a-zA-Z-]+)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]*))?/g)
          ?.filter((attr: string) => {
            const name = attr.trim().split(/[\s=]/)[0].toLowerCase();
            if (!allowedAttrs.has(name)) return false;
            // Validate href values to prevent javascript: protocol XSS
            if (name === "href") {
              const valueMatch = attr.match(/=\s*(?:"([^"]*)"|'([^']*)'|(\S+))/);
              const value = (valueMatch?.[1] ?? valueMatch?.[2] ?? valueMatch?.[3] ?? "")
                .trim()
                .toLowerCase();
              if (value && !/^(https?:\/\/|mailto:|\/[^/])/.test(value)) return false;
            }
            return true;
          })
          .join("") ?? "";

      return match.startsWith("</") ? `</${lowerTag}>` : `<${lowerTag}${safeAttrs}>`;
    });
}

/**
 * Sanitize plain text - strips ALL HTML tags.
 * Use for text fields like names, descriptions, comments.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, "") // Remove HTML comments
    .replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "") // Remove dangerous tags with content
    .replace(/<[^>]*>/g, ""); // Remove all remaining HTML tags
}

/**
 * Sanitize and trim text input.
 * Common utility for form fields.
 */
export function sanitizeInput(input: string | null | undefined): string | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (!trimmed) return null;
  return sanitizeText(trimmed);
}

/**
 * Sanitize object values recursively.
 * Useful for sanitizing form data objects.
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
 * Check if a string contains potentially dangerous content.
 * Returns true if the string contains HTML/script tags.
 */
export function containsHtml(input: string): boolean {
  const htmlPattern = /<[^>]*>/;
  return htmlPattern.test(input);
}

/**
 * Escape HTML entities for safe display.
 * Use when you need to display user input as plain text.
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
