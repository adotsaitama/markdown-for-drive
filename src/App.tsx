import { useMemo } from "react";
import { IconMoon, IconSun } from "./components/Icons";
import { ErrorFallback } from "./components/ErrorFallback";
import { useDriveFile } from "./hooks/useDriveFile";
import { useGoogleAuth } from "./hooks/useGoogleAuth";
import { useTheme } from "./hooks/useTheme";
import { extractOpenFileId } from "./lib/driveState";
import { EditorPage } from "./pages/EditorPage";
import { HomePage } from "./pages/HomePage";
import { useRouter } from "./router";

export default function App() {
  const fileId = useMemo(() => extractOpenFileId(window.location.search), []);
  const { route, navigate } = useRouter();
  const auth = useGoogleAuth();
  const file = useDriveFile(fileId, auth.accessToken);
  const { mode, toggle } = useTheme();
  const themeLabel =
    mode === "dark" ? "ライトモードに切り替え" : "ダークモードに切り替え";
  const themeIcon = mode === "dark" ? <IconSun /> : <IconMoon />;
  const themeToggle = (
    <button
      className="icon-button"
      type="button"
      aria-label={themeLabel}
      title={themeLabel}
      onClick={toggle}
    >
      {themeIcon}
    </button>
  );

  if (route === "not-found") {
    return (
      <div className="not-found">
        <p>ページが見つかりません。</p>
        <button
          className="primary-button"
          type="button"
          onClick={() => navigate("/")}
        >
          ホームへ戻る
        </button>
      </div>
    );
  }

  if (!fileId) {
    return (
      <HomePage
        hasLaunchFile={false}
        auth={auth}
        onToggleTheme={toggle}
        themeLabel={themeLabel}
        themeIcon={themeIcon}
      />
    );
  }

  if (!auth.accessToken) {
    return (
      <HomePage
        hasLaunchFile
        auth={auth}
        onToggleTheme={toggle}
        themeLabel={themeLabel}
        themeIcon={themeIcon}
      />
    );
  }

  if (file.isPending) {
    return (
      <AppFrame themeToggle={themeToggle}>
        <div className="notice">
          <p className="loading">Google Driveから読み込み中…</p>
        </div>
      </AppFrame>
    );
  }

  if (file.isError) {
    return (
      <AppFrame themeToggle={themeToggle}>
        <ErrorFallback
          error={file.error}
          onRetry={() => void file.refetch()}
          onReauth={auth.signIn}
        />
      </AppFrame>
    );
  }

  if (file.data) {
    return (
      <EditorPage
        key={file.data.meta.id}
        fileId={fileId}
        accessToken={auth.accessToken}
        driveFile={file.data}
        dark={mode === "dark"}
        themeToggle={themeToggle}
        onBack={() => navigate("/")}
        onReauth={auth.signIn}
      />
    );
  }

  return null;
}

function AppFrame({
  children,
  themeToggle,
}: {
  children: React.ReactNode;
  themeToggle: React.ReactNode;
}) {
  return (
    <div className="app">
      <header className="app-header">
        <div className="title-block">
          <h1 className="doc-title">Markdown for Drive</h1>
        </div>
        {themeToggle}
      </header>
      <main className="app-main">{children}</main>
    </div>
  );
}
