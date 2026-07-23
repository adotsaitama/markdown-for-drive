interface HomePageProps {
  onOpenDemo: () => void;
  onToggleTheme: () => void;
  themeLabel: string;
  themeIcon: React.ReactNode;
}

export function HomePage({
  onOpenDemo,
  onToggleTheme,
  themeLabel,
  themeIcon,
}: HomePageProps) {
  return (
    <div className="app">
      <header className="app-header">
        <div className="title-block">
          <h1 className="doc-title">Markdown for Drive</h1>
          <span className="doc-meta">
            Google Drive から Markdown を開くためのエディタ
          </span>
        </div>
        <button
          className="icon-button"
          type="button"
          aria-label={themeLabel}
          title={themeLabel}
          onClick={onToggleTheme}
        >
          {themeIcon}
        </button>
      </header>
      <main className="empty-state">
        <div className="empty-state-card">
          <span className="file-mark" aria-hidden="true">
            MD
          </span>
          <h2>ファイルが指定されていません</h2>
          <p>
            Google Drive の「アプリで開く」から Markdown ファイルを選ぶと、
            ここに編集ワークスペースが開きます。
          </p>
          <button className="primary-button" type="button" onClick={onOpenDemo}>
            モック文書を開く
          </button>
        </div>
      </main>
    </div>
  );
}
