import { IconMoon, IconSun } from "./components/Icons";
import { useTheme } from "./hooks/useTheme";
import { EditorPage } from "./pages/EditorPage";
import { HomePage } from "./pages/HomePage";
import { useRouter } from "./router";

export default function App() {
  const { route, navigate } = useRouter();
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

  if (route === "editor") {
    return (
      <EditorPage
        dark={mode === "dark"}
        themeToggle={themeToggle}
        onBack={() => navigate("/")}
      />
    );
  }

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

  return (
    <HomePage
      onOpenDemo={() => navigate("/editor")}
      onToggleTheme={toggle}
      themeLabel={themeLabel}
      themeIcon={themeIcon}
    />
  );
}
