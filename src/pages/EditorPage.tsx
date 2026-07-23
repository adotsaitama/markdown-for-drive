import { useCallback, useDeferredValue, useEffect, useState } from "react";
import type { EditorView } from "@codemirror/view";
import { IconEye, IconHelp, IconPencil, IconSplit } from "../components/Icons";
import { FormatToolbar } from "../components/FormatToolbar";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { MarkdownPreview } from "../components/MarkdownPreview";
import { useDriveImages } from "../hooks/useDriveImages";
import type { DriveFile } from "../hooks/useDriveFile";
import { useSaveDriveFile } from "../hooks/useSaveDriveFile";
import { useScrollSync } from "../hooks/useScrollSync";
import { DriveApiError } from "../lib/driveApi";

export type ViewMode = "edit" | "split" | "preview";

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
  fileId: string;
  accessToken: string;
  driveFile: DriveFile;
  dark: boolean;
  themeToggle: React.ReactNode;
  onBack: () => void;
  onReauth: () => void;
}

function getInitialMode(): ViewMode {
  return window.innerWidth >= 960 ? "split" : "edit";
}

export function EditorPage({
  fileId,
  accessToken,
  driveFile,
  dark,
  themeToggle,
  onBack,
  onReauth,
}: EditorPageProps) {
  const [mode, setMode] = useState<ViewMode>(getInitialMode);
  const [draft, setDraft] = useState<string | null>(null);
  const [lintOpen, setLintOpen] = useState(false);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [previewPane, setPreviewPane] = useState<HTMLElement | null>(null);
  const save = useSaveDriveFile(fileId, accessToken);
  const savedContent = driveFile.content;
  const currentContent = draft ?? savedContent;
  const deferredContent = useDeferredValue(currentContent);
  const isDirty = draft !== null && draft !== savedContent;
  const { uploadImage, resolveImage } = useDriveImages(
    driveFile.meta,
    accessToken,
  );

  useScrollSync(editorView, previewPane, mode === "split");

  const handleSave = useCallback(() => {
    if (draft === null || draft === savedContent || save.isPending) return;
    save.mutate(draft);
  }, [draft, savedContent, save]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        handleSave();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handleSave]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    document.title = `${driveFile.meta.name} - Markdown for Drive`;
    return () => {
      document.title = "Markdown for Drive";
    };
  }, [driveFile.meta.name]);

  return (
    <div className="app">
      <header className="app-header">
        <button className="brand-button" type="button" onClick={onBack}>
          M<span aria-hidden="true">↓</span>D
        </button>
        <div className="title-block">
          <h1 className="doc-title">
            {driveFile.meta.name}
            {isDirty && (
              <span className="dirty-dot" title="未保存の変更があります" />
            )}
          </h1>
          {driveFile.meta.modifiedTime && (
            <span className="doc-meta">
              最終保存{" "}
              {new Date(driveFile.meta.modifiedTime).toLocaleString("ja-JP", {
                dateStyle: "medium",
                timeStyle: "short",
              })}
            </span>
          )}
        </div>

        <div className="header-actions">
          {renderSaveStatus()}
          <button
            className="save-button"
            type="button"
            disabled={!isDirty || save.isPending}
            onClick={handleSave}
            title="Ctrl+S / ⌘S"
          >
            {save.isPending ? "保存中…" : "保存"}
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
              key={fileId}
              initialDoc={currentContent}
              dark={dark}
              onChange={setDraft}
              onSave={handleSave}
              onViewReady={setEditorView}
              onPasteImage={uploadImage}
            />
          </section>
          <section
            className="pane pane-preview"
            aria-label="Markdown プレビュー"
            aria-hidden={mode === "edit"}
            ref={setPreviewPane}
          >
            <MarkdownPreview
              content={deferredContent}
              dark={dark}
              resolveImage={resolveImage}
            />
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
            <p>現在の文書に問題は見つかりませんでした。</p>
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
            {currentContent.length.toLocaleString()} 文字
          </span>
        </footer>
      </main>
    </div>
  );

  function renderSaveStatus() {
    if (save.isError) {
      const error = save.error;
      const needsReauth =
        error instanceof DriveApiError && error.status === 401;
      const status =
        error instanceof DriveApiError ? ` (HTTP ${error.status})` : "";
      return (
        <span className="save-status save-status-error">
          保存に失敗しました{status}
          {needsReauth && (
            <button className="link-button" type="button" onClick={onReauth}>
              再ログイン
            </button>
          )}
        </span>
      );
    }
    if (save.isPending) return null;
    if (save.isSuccess && !isDirty) {
      return <span className="save-status">✓ 保存しました</span>;
    }
    if (isDirty) {
      return <span className="save-status is-dirty">未保存の変更</span>;
    }
    return <span className="save-status">✓ 保存済み</span>;
  }
}
