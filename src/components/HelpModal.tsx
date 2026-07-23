import { useEffect } from "react";
import { EDITOR_COMMANDS, type EditorCommand } from "../lib/editorCommands";
import { formatShortcut, getShortcuts } from "../lib/shortcutConfig";

interface HelpModalProps {
  onClose: () => void;
}

export function HelpModal({ onClose }: HelpModalProps) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const shortcuts = getShortcuts();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label="ヘルプ"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="modal-header">
          <h2>ヘルプ</h2>
          <button
            className="icon-button"
            type="button"
            aria-label="閉じる"
            onClick={onClose}
          >
            ×
          </button>
        </div>
        <div className="modal-body modal-columns">
          <section>
            <h3>このエディタについて</h3>
            <p>
              Google Drive の「アプリで開く」から <code>.md</code>{" "}
              ファイルを開き、閲覧・編集・上書き保存できます。
            </p>
            <ul>
              <li>
                <strong>表示モード</strong>: ヘッダ右のアイコンで 編集 / 分割 /
                表示を切り替えます。分割時はスクロールが同期します。
              </li>
              <li>
                <strong>保存</strong>: 保存ボタンまたはショートカットで
                Driveに上書きします。過去の版はDriveの「版を管理」から確認できます。
              </li>
              <li>
                <strong>画像</strong>: 画像を貼り付けると同じフォルダの{" "}
                <code>images/</code> に保存し、相対パスで参照します。
              </li>
              <li>
                <strong>テーブル</strong>:
                表アイコンからサイズを選び、空のテーブルを挿入できます。
              </li>
              <li>
                <strong>Mermaid</strong>: <code>```mermaid</code>{" "}
                のコードブロックはプレビューで図になります。
              </li>
              <li>
                <strong>インライン編集</strong>: 表示モードでブロックを
                <strong>ダブルクリック</strong>
                すると、その場でソースを編集できます。
              </li>
              <li>
                <strong>Lint</strong>:
                画面下の件数をクリックすると詳細を開き、該当行へ移動できます。
              </li>
              <li>
                <strong>整形</strong>: 🪄
                ボタンで文書全体をPrettier整形します（元に戻せます）。
              </li>
            </ul>
          </section>

          <section>
            <h3>キーボードショートカット</h3>
            <table className="shortcut-table">
              <tbody>
                {EDITOR_COMMANDS.filter((command) => shortcuts[command.id]).map(
                  (entry) => {
                    const command = entry as EditorCommand;
                    return (
                      <tr key={entry.id}>
                        <td>
                          <kbd>{formatShortcut(shortcuts[entry.id])}</kbd>
                        </td>
                        <td>
                          {command.label}
                          {command.hint ? `（${command.hint}）` : ""}
                        </td>
                      </tr>
                    );
                  },
                )}
                <tr>
                  <td>
                    <kbd>Tab</kbd> / <kbd>Shift+Tab</kbd>
                  </td>
                  <td>リスト項目のインデント / 解除</td>
                </tr>
              </tbody>
            </table>
            <p className="help-note">
              ショートカットは設定から動的に生成されます。
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
