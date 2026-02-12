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
 * Sanitize plain text - strips ALL HTML tags.
 * Use for text fields like names, descriptions, comments.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<!--[\s\S]*?-->/g, "") // Remove HTML comments
    .replace(/<(script|style|iframe|object|embed)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, "") // Remove dangerous tags with content
    .replace(/<[^>]*>/g, ""); // Remove all remaining HTML tags
}
