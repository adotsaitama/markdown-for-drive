import type { Text } from "@codemirror/state";

export interface InlineEditRange {
  from: number;
  to: number;
  startLine: number;
  endLine: number;
  text: string;
}

/**
 * Maps a rendered top-level block to its exact Markdown source range.
 * The following block starts the boundary; trailing blank lines are excluded.
 */
export function getInlineEditRange(
  doc: Text,
  startLine: number,
  nextStartLine?: number,
): InlineEditRange | null {
  if (!Number.isInteger(startLine) || startLine < 1 || startLine > doc.lines) {
    return null;
  }

  let endLine =
    Number.isInteger(nextStartLine) && (nextStartLine as number) > startLine
      ? (nextStartLine as number) - 1
      : doc.lines;
  endLine = Math.min(Math.max(startLine, endLine), doc.lines);
  while (endLine > startLine && doc.line(endLine).text.trim() === "") {
    endLine -= 1;
  }

  const from = doc.line(startLine).from;
  const to = doc.line(endLine).to;
  return {
    from,
    to,
    startLine,
    endLine,
    text: doc.sliceString(from, to),
  };
}
