import { LoginButton } from "../components/LoginButton";
import type { GoogleAuth } from "../hooks/useGoogleAuth";

interface HomePageProps {
  hasLaunchFile: boolean;
  auth: GoogleAuth;
  onToggleTheme: () => void;
  themeLabel: string;
  themeIcon: React.ReactNode;
}

export function HomePage({
  hasLaunchFile,
  auth,
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
            Google DriveからMarkdownを開くためのエディタ
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
          <h2>
            {hasLaunchFile
              ? "Google Driveへのアクセスを許可してください"
              : "ファイルが指定されていません"}
          </h2>
          <p>
            {hasLaunchFile
              ? "ファイルとメタデータを読み込むには、Googleアカウントでのログインが必要です。"
              : "Google Driveの「アプリで開く」からMarkdownファイルを選ぶと、編集ワークスペースが開きます。初回ログインで「アプリで開く」に登録されます。"}
          </p>
          {!auth.accessToken ? (
            <LoginButton
              onClick={auth.signIn}
              disabled={!auth.isConfigured || !auth.isReady}
              isAuthenticating={auth.isAuthenticating}
            />
          ) : (
            <p className="auth-success">
              ✓ ログインしました。Google
              DriveからMarkdownファイルを開いてください。
            </p>
          )}
          {auth.error && <p className="inline-error">{auth.error}</p>}
        </div>
      </main>
    </div>
  );
}
