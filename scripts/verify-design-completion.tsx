import assert from "node:assert/strict";
import { EditorState } from "@codemirror/state";
import { renderToStaticMarkup } from "react-dom/server";

Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: { platform: "Linux" },
});
Object.defineProperty(globalThis, "localStorage", {
  configurable: true,
  value: {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  },
});
Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: { innerWidth: 1200, innerHeight: 900 },
});

async function main() {
  const { lintMarkdown } = await import("../src/hooks/useMarkdownLint");
  const { HelpModal } = await import("../src/components/HelpModal");
  const { InlineEditPopover } =
    await import("../src/components/InlineEditPopover");
  const { logger, subscribeToFatalErrors } = await import("../src/lib/logger");
  const { getInlineEditRange } = await import("../src/lib/inlineEdit");

  const issues = await lintMarkdown("#Heading\n\nTrailing spaces  \n");
  assert(
    issues.some((issue) => issue.rule.includes("MD018")),
    "markdownlint did not report a missing heading space",
  );
  assert(
    issues.every((issue) => !issue.rule.includes("MD013")),
    "MD013 must stay disabled",
  );

  const helpHtml = renderToStaticMarkup(
    <HelpModal onClose={() => undefined} />,
  );
  for (const requiredText of [
    "表示モード",
    "保存",
    "画像",
    "テーブル",
    "Mermaid",
    "ダブルクリック",
    "Lint",
    "整形",
    "キーボードショートカット",
  ]) {
    assert(
      helpHtml.includes(requiredText),
      `Help modal is missing: ${requiredText}`,
    );
  }
  assert.match(helpHtml, /Ctrl\+S/, "Shortcut config was not rendered");

  const inlineHtml = renderToStaticMarkup(
    <InlineEditPopover
      anchor={{ top: 100, left: 100 }}
      startLine={3}
      endLine={5}
      initialText={"## Block\n\nText"}
      dark={false}
      onApply={() => undefined}
      onClose={() => undefined}
    />,
  );
  assert.match(inlineHtml, /ソース編集（3〜5行）/);
  assert.match(inlineHtml, /Ctrl\+Enter \/ Ctrl\+S/);
  assert.doesNotMatch(
    inlineHtml,
    /文書全体を整形/,
    "Inline toolbar must omit formatDoc",
  );

  const source = "# First\nbody\n\n## Second\nnext";
  const doc = EditorState.create({ doc: source }).doc;
  assert.deepEqual(getInlineEditRange(doc, 1, 4), {
    from: 0,
    to: 12,
    startLine: 1,
    endLine: 2,
    text: "# First\nbody",
  });
  assert.equal(getInlineEditRange(doc, 0), null);

  let receivedMessage = "";
  const stop = subscribeToFatalErrors((notice) => {
    receivedMessage = notice.message;
  });
  const originalConsoleError = console.error;
  let logged = "";
  console.error = (payload: unknown) => {
    logged = JSON.stringify(payload);
  };
  const sensitiveError = Object.assign(new Error("Upload failed"), {
    status: 500,
    accessToken: "must-not-be-logged",
    content: "must-not-be-logged",
  });
  logger.error("verification", sensitiveError, "ユーザー向け通知");
  console.error = originalConsoleError;
  stop();

  assert.equal(receivedMessage, "ユーザー向け通知");
  assert.match(logged, /"status":500/);
  assert.doesNotMatch(logged, /must-not-be-logged/);

  console.log(
    "Design completion verified: real markdownlint, help topics and dynamic shortcuts, inline editor shell, and sanitized fatal notifications.",
  );
}

void main();
