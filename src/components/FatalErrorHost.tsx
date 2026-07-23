import {
  Component,
  useEffect,
  useState,
  type ErrorInfo,
  type ReactNode,
} from "react";
import {
  logger,
  subscribeToFatalErrors,
  type FatalNotice,
} from "../lib/logger";

export function FatalErrorHost() {
  const [notices, setNotices] = useState<FatalNotice[]>([]);

  useEffect(
    () =>
      subscribeToFatalErrors((notice) => {
        setNotices((current) => [...current.slice(-2), notice]);
      }),
    [],
  );

  useEffect(() => {
    const onError = (event: ErrorEvent) => {
      logger.error(
        "window.onerror",
        event.error ?? event.message,
        "予期しないエラーが発生しました。",
      );
    };
    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      logger.error(
        "unhandledrejection",
        event.reason,
        "予期しないエラーが発生しました。",
      );
    };
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  if (notices.length === 0) return null;

  return (
    <div className="fatal-notices" role="region" aria-label="エラー通知">
      {notices.map((notice) => (
        <div className="fatal-notice" role="alert" key={notice.id}>
          <span>{notice.message}</span>
          <button
            type="button"
            aria-label="エラー通知を閉じる"
            onClick={() =>
              setNotices((current) =>
                current.filter((item) => item.id !== notice.id),
              )
            }
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}

interface FatalErrorBoundaryProps {
  children: ReactNode;
}

interface FatalErrorBoundaryState {
  failed: boolean;
}

/** Handles React render failures that do not reach unhandledrejection. */
export class FatalErrorBoundary extends Component<
  FatalErrorBoundaryProps,
  FatalErrorBoundaryState
> {
  state: FatalErrorBoundaryState = { failed: false };

  static getDerivedStateFromError(): FatalErrorBoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    logger.error(
      "react",
      error,
      "予期しないエラーが発生しました。ページを再読み込みしてください。",
    );
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="fatal-screen" role="alert">
          <h1>予期しないエラーが発生しました</h1>
          <p>作業内容を確認して、ページを再読み込みしてください。</p>
          <button type="button" onClick={() => window.location.reload()}>
            再読み込み
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}
