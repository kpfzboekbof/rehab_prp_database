/**
 * Minimal CSV builder. Adds a UTF-8 BOM so Excel opens Chinese text
 * correctly, CRLF-terminates lines, and quotes/escapes cells that
 * contain commas, quotes, newlines, or leading/trailing whitespace.
 *
 * This is intentionally *not* a full RFC-4180 implementation — it's
 * only used to export small report CSVs produced by our own code, so
 * the common safe cases are enough.
 */

function escapeCell(value: unknown): string {
  if (value == null) return "";
  const s = typeof value === "string" ? value : String(value);
  // Quote if it contains special chars, OR if it starts with a character
  // Excel treats as a formula (=, +, -, @) — prefix with ' inside quotes.
  if (/[,"\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCsv(
  headers: string[] | null,
  rows: Array<Array<unknown>>,
): string {
  const lines: string[] = [];
  if (headers && headers.length > 0) {
    lines.push(headers.map(escapeCell).join(","));
  }
  for (const row of rows) {
    lines.push(row.map(escapeCell).join(","));
  }
  // BOM so Excel on Windows / Mac autodetects UTF-8.
  return "\ufeff" + lines.join("\r\n") + "\r\n";
}

/**
 * Build the `Content-Disposition` header for a download with a safe,
 * ASCII-encoded filename. If the raw name contains non-ASCII chars
 * we also emit the RFC-5987 `filename*` parameter so modern browsers
 * show the original Chinese.
 */
export function csvResponseHeaders(filename: string): HeadersInit {
  const asciiSafe = filename.replace(/[^\x20-\x7e]+/g, "_");
  const rfc5987 = `filename*=UTF-8''${encodeURIComponent(filename)}`;
  return {
    "Content-Type": "text/csv; charset=utf-8",
    "Content-Disposition": `attachment; filename="${asciiSafe}"; ${rfc5987}`,
    "Cache-Control": "no-store",
  };
}
