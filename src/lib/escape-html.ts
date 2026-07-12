/**
 * Minimal HTML entity escaping for user-controlled text embedded in
 * HTML email bodies and Telegram messages (parse_mode: "HTML").
 */

const ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapeHtml(input: string): string {
  return input.replace(/[&<>"']/g, (ch) => ENTITIES[ch] ?? ch);
}
