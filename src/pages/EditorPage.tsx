import { useCallback, useDeferredValue, useEffect, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { IconEye, IconHelp, IconPencil, IconSplit } from "../components/Icons";
import { FormatToolbar } from "../components/FormatToolbar";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { MarkdownPreview } from "../components/MarkdownPreview";
import { useScrollSync } from "../hooks/useScrollSync";

export type ViewMode = "edit" | "split" | "preview";

const MOCK_DOCUMENT = `# Markdown for Drive

Google Drive に置いた Markdown を、集中して読み書きするためのワークスペースです。

## このモックで確認できること

- **編集**・**分割**・**表示**を滑らかに切り替え
- ライト / ダークの Blue Topaz テーマ
- 入力内容を遅延更新する Markdown プレビュー

> 文書タイトルを主役にし、書式操作と表示モードを分けています。

### コード

\`\`\`ts
const workspace = {
  edit: "1fr 0fr",
  split: "1fr 1fr",
  preview: "0fr 1fr",
};
\`\`\`

| モード | エディタ | プレビュー |
| --- | --- | --- |
| edit | 表示 | 非表示 |
| split | 表示 | 表示 |
| preview | 非表示 | 表示 |
`;

const MODES: Array<{
  value: ViewMode;
  label: string;
  icon: typeof IconPencil;
}> = [
  { value: "edit", label: "編集", icon: IconPencil },
  { value: "split", label: "分割", icon: IconSplit },
  { value: "preview", label: "表示", icon: IconEye },
];

interface EditorPageProps {
  dark: boolean;
  themeToggle: React.ReactNode;
  onBack: () => void;
}

function getInitialMode(): ViewMode {
  return window.innerWidth >= 960 ? "split" : "edit";
}

export function EditorPage({ dark, themeToggle, onBack }: EditorPageProps) {
  const [mode, setMode] = useState<ViewMode>(getInitialMode);
  const [buffer, setBuffer] = useState(MOCK_DOCUMENT);
  const [savedBuffer, setSavedBuffer] = useState(MOCK_DOCUMENT);
  const [lintOpen, setLintOpen] = useState(false);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [previewPane, setPreviewPane] = useState<HTMLElement | null>(null);
  const deferredBuffer = useDeferredValue(buffer);
  const isDirty = buffer !== savedBuffer;

  useScrollSync(editorView, previewPane, mode === "split");

  const handleSave = useCallback(() => {
    setSavedBuffer(buffer);
  }, [buffer]);

  useEffect(() => {
    document.title = "Welcome.md - Markdown for Drive";
    return () => {
      document.title = "Markdown for Drive";
    };
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <button className="brand-button" type="button" onClick={onBack}>
          M<span aria-hidden="true">↓</span>D
        </button>
        <div className="title-block">
          <h1 className="doc-title">
            Welcome.md
            {isDirty && (
              <span className="dirty-dot" title="未保存の変更があります" />
            )}
          </h1>
          <span className="doc-meta">最終保存 2026/07/23 10:30</span>
        </div>

        <div className="header-actions">
          <span className={isDirty ? "save-status is-dirty" : "save-status"}>
            {isDirty ? "未保存の変更" : "✓ 保存済み"}
          </span>
          <button
            className="save-button"
            type="button"
            disabled={!isDirty}
            onClick={handleSave}
          >
            保存
          </button>
          <div className="mode-tabs" role="tablist" aria-label="表示モード">
            {MODES.map(({ value, label, icon: Icon }) => (
              <button
                className={
                  mode === value ? "mode-button is-active" : "mode-button"
                }
                type="button"
                role="tab"
                aria-label={label}
                aria-selected={mode === value}
                title={label}
                key={value}
                onClick={() => setMode(value)}
              >
                <Icon />
              </button>
            ))}
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="ヘルプ"
            title="ヘルプ"
          >
            <IconHelp />
          </button>
          {themeToggle}
        </div>
      </header>

      <main className="app-main">
        <div className="toolbar">
          <FormatToolbar view={editorView} disabled={mode === "preview"} />
        </div>

        <div className={`workspace mode-${mode}`} data-mode={mode}>
          <section
            className="pane pane-editor"
            aria-label="Markdown エディタ"
            aria-hidden={mode === "preview"}
          >
            <MarkdownEditor
              initialDoc={MOCK_DOCUMENT}
              dark={dark}
              onChange={setBuffer}
              onSave={handleSave}
              onViewReady={setEditorView}
            />
          </section>
          <section
            className="pane pane-preview"
            aria-label="Markdown プレビュー"
            aria-hidden={mode === "edit"}
            ref={setPreviewPane}
          >
            <MarkdownPreview content={deferredBuffer} dark={dark} />
          </section>
        </div>

        {lintOpen && (
          <section className="lint-panel" aria-label="Lint 結果">
            <div className="lint-panel-header">
              <span>Lint 結果</span>
              <button
                className="icon-button"
                type="button"
                aria-label="Lint パネルを閉じる"
                onClick={() => setLintOpen(false)}
              >
                ×
              </button>
            </div>
            <p>モックバッファに問題は見つかりませんでした。</p>
          </section>
        )}

        <footer className="status-bar">
          <button
            className="lint-summary"
            type="button"
            aria-expanded={lintOpen}
            onClick={() => setLintOpen((current) => !current)}
          >
            ✓ Lint: 問題なし
          </button>
          <span className="char-count">
            {buffer.length.toLocaleString()} 文字
          </span>
        </footer>
      </main>
    </div>
  );
}
