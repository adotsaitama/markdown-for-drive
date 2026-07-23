import { useEffect, useState } from "react";
import { logger } from "../lib/logger";

export interface LintIssue {
  line: number;
  rule: string;
  description: string;
  detail: string | null;
}

const LINT_CONFIG = { default: true, MD013: false } as const;

export async function lintMarkdown(content: string): Promise<LintIssue[]> {
  const { lint } = await import("markdownlint/promise");
  const results = await lint({
    strings: { doc: content },
    config: LINT_CONFIG,
  });
  return (results.doc ?? []).map((error) => ({
    line: error.lineNumber,
    rule: error.ruleNames.join(" / "),
    description: error.ruleDescription,
    detail: error.errorDetail ?? null,
  }));
}

/**
 * Runs markdownlint after 600ms of inactivity. Loading and lint errors are
 * non-fatal: the editor stays usable and the result becomes an empty list.
 */
export function useMarkdownLint(content: string | null): LintIssue[] {
  const [issues, setIssues] = useState<LintIssue[]>([]);

  useEffect(() => {
    if (content === null) {
      setIssues([]);
      return;
    }
    let cancelled = false;
    const timer = window.setTimeout(() => {
      void lintMarkdown(content)
        .then((next) => {
          if (!cancelled) setIssues(next);
        })
        .catch((error: unknown) => {
          logger.warn("markdownlint", error);
          if (!cancelled) setIssues([]);
        });
    }, 600);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [content]);

  return issues;
}
