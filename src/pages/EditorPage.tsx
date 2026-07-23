import {
  useCallback,
  useDeferredValue,
  useEffect,
  useRef,
  useState,
} from "react";
import type { EditorView } from "@codemirror/view";
import { IconEye, IconHelp, IconPencil, IconSplit } from "../components/Icons";
import { FormatToolbar } from "../components/FormatToolbar";
import { HelpModal } from "../components/HelpModal";
import { InlineEditPopover } from "../components/InlineEditPopover";
import { MarkdownEditor } from "../components/MarkdownEditor";
import { MarkdownPreview } from "../components/MarkdownPreview";
import { useDriveImages } from "../hooks/useDriveImages";
import type { DriveFile } from "../hooks/useDriveFile";
import { useMarkdownLint } from "../hooks/useMarkdownLint";
import { useSaveDriveFile } from "../hooks/useSaveDriveFile";
import { useScrollSync } from "../hooks/useScrollSync";
import { DriveApiError } from "../lib/driveApi";
import { getInlineEditRange } from "../lib/inlineEdit";
import { logger } from "../lib/logger";

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

interface InlineEditState {
  from: number;
  to: number;
  startLine: number;
  endLine: number;
  text: string;
  anchor: { top: number; left: number };
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
  const [helpOpen, setHelpOpen] = useState(false);
  const [inlineEdit, setInlineEdit] = useState<InlineEditState | null>(null);
  const [editorView, setEditorView] = useState<EditorView | null>(null);
  const [previewPane, setPreviewPane] = useState<HTMLElement | null>(null);
  const inlineEditOpenRef = useRef(false);
  const save = useSaveDriveFile(fileId, accessToken);
  const savedContent = driveFile.content;
  const currentContent = draft ?? savedContent;
  const deferredContent = useDeferredValue(currentContent);
  const isDirty = draft !== null && draft !== savedContent;
  const lintIssues = useMarkdownLint(currentContent);
  const { uploadImage, resolveImage } = useDriveImages(
    driveFile.meta,
    accessToken,
  );

  useScrollSync(editorView, previewPane, mode === "split");
  inlineEditOpenRef.current = inlineEdit !== null;

  const jumpToLine = useCallback(
    (line: number) => {
      if (!editorView) return;
      setMode((current) => (current === "preview" ? "split" : current));
      const doc = editorView.state.doc;
      const target = doc.line(Math.min(Math.max(1, line), doc.lines));
      editorView.dispatch({
        selection: { anchor: target.from },
        scrollIntoView: true,
      });
      editorView.focus();
    },
    [editorView],
  );

  const handlePreviewDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLElement>) => {
      if (mode !== "preview" || !editorView) return;
      const target = event.target as HTMLElement;
      if (target.closest("a")) return;

      const article = event.currentTarget.querySelector(".markdown-body");
      if (!article) return;

      let block: HTMLElement | null = null;
      for (
        let node: HTMLElement | null = target;
        node && node !== article;
        node = node.parentElement
      ) {
        if (node.parentElement === article && node.dataset.line) {
          block = node;
          break;
        }
      }
      if (!block) return;

      const doc = editorView.state.doc;
      const startLine = Number(block.dataset.line);
      let nextStartLine: number | undefined;
      for (
        let sibling = block.nextElementSibling;
        sibling;
        sibling = sibling.nextElementSibling
      ) {
        const nextLine = Number((sibling as HTMLElement).dataset.line);
        if (Number.isInteger(nextLine) && nextLine > startLine) {
          nextStartLine = nextLine;
          break;
        }
      }
      const range = getInlineEditRange(doc, startLine, nextStartLine);
      if (!range) return;
      const rect = block.getBoundingClientRect();
      setInlineEdit({
        ...range,
        anchor: { top: rect.bottom, left: rect.left },
      });
    },
    [editorView, mode],
  );

  const applyInlineEdit = useCallback(
    (text: string) => {
      if (!inlineEdit || !editorView) return;
      editorView.dispatch({
        changes: {
          from: inlineEdit.from,
          to: inlineEdit.to,
          insert: text,
        },
        userEvent: "input",
      });
      setInlineEdit(null);
    },
    [editorView, inlineEdit],
  );

  const handleSave = useCallback(() => {
    if (draft === null || draft === savedContent || save.isPending) return;
    save.mutate(draft);
  }, [draft, savedContent, save]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        if (!inlineEditOpenRef.current) handleSave();
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
    if (mode !== "preview") setInlineEdit(null);
  }, [mode]);

  useEffect(() => {
    if (save.isError) {
      logger.error(
        "drive.save",
        save.error,
        "Google Driveへの保存に失敗しました。",
      );
    } else if (save.isSuccess) {
      logger.info("drive.save", "File save completed");
    }
  }, [save.error, save.isError, save.isSuccess]);

  useEffect(() => {
    document.title = `${driveFile.meta.name} - Drive Markdown Editor`;
    return () => {
      document.title = "Drive Markdown Editor";
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
            title="ヘルプ・ショートカット一覧"
            onClick={() => setHelpOpen(true)}
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
            onDoubleClick={handlePreviewDoubleClick}
          >
            <MarkdownPreview
              content={deferredContent}
              dark={dark}
              resolveImage={resolveImage}
            />
          </section>
        </div>

        {inlineEdit && (
          <InlineEditPopover
            anchor={inlineEdit.anchor}
            startLine={inlineEdit.startLine}
            endLine={inlineEdit.endLine}
            initialText={inlineEdit.text}
            dark={dark}
            onApply={applyInlineEdit}
            onClose={() => setInlineEdit(null)}
          />
        )}

        {lintOpen && (
          <section className="lint-panel" aria-label="Lint 結果">
            <div className="lint-panel-header">
              <span>Lint 結果（markdownlint）</span>
              <button
                className="icon-button"
                type="button"
                aria-label="Lint パネルを閉じる"
                onClick={() => setLintOpen(false)}
              >
                ×
              </button>
            </div>
            {lintIssues.length === 0 ? (
              <p className="lint-empty">問題は見つかりませんでした 🎉</p>
            ) : (
              <ul className="lint-list">
                {lintIssues.map((issue, index) => (
                  <li key={`${issue.line}-${issue.rule}-${index}`}>
                    <button
                      className="lint-item"
                      type="button"
                      onClick={() => jumpToLine(issue.line)}
                    >
                      <span className="lint-line">{issue.line}行</span>
                      <span className="lint-rule">{issue.rule}</span>
                      <span>
                        {issue.description}
                        {issue.detail ? ` — ${issue.detail}` : ""}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
        )}

        <footer className="status-bar">
          <button
            className={
              lintIssues.length > 0 ? "lint-summary warn" : "lint-summary"
            }
            type="button"
            aria-expanded={lintOpen}
            title="クリックで詳細パネルを開閉"
            onClick={() => setLintOpen((current) => !current)}
          >
            {lintIssues.length > 0
              ? `⚠ Lint: ${lintIssues.length} 件`
              : "✓ Lint: 問題なし"}
          </button>
          <span className="char-count">
            {currentContent.length.toLocaleString()} 文字
          </span>
        </footer>
      </main>
      {helpOpen && <HelpModal onClose={() => setHelpOpen(false)} />}
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
