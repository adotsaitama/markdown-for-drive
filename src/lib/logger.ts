export interface FatalNotice {
  id: number;
  scope: string;
  message: string;
}

interface SafeError {
  name: string;
  message: string;
  status?: number;
}

type FatalListener = (notice: FatalNotice) => void;

const fatalListeners = new Set<FatalListener>();
const pendingNotices: FatalNotice[] = [];
let nextNoticeId = 0;

function safeError(error: unknown): SafeError {
  if (error instanceof Error) {
    const status =
      "status" in error && typeof error.status === "number"
        ? error.status
        : undefined;
    return { name: error.name, message: error.message, status };
  }
  return {
    name: "Error",
    message: typeof error === "string" ? error : "Unknown error",
  };
}

function consolePayload(scope: string, error: unknown) {
  const { name, message, status } = safeError(error);
  return status === undefined
    ? { scope, name, message }
    : { scope, name, status, message };
}

/**
 * Central logging boundary. It intentionally records only scope, status,
 * error name and message — never access tokens, file ids or document content.
 */
export const logger = {
  debug(scope: string, message: string) {
    console.debug({ scope, message });
  },
  info(scope: string, message: string) {
    console.info({ scope, message });
  },
  warn(scope: string, error: unknown) {
    console.warn(consolePayload(scope, error));
  },
  error(
    scope: string,
    error: unknown,
    userMessage = "操作に失敗しました。もう一度お試しください。",
  ) {
    console.error(consolePayload(scope, error));
    const notice = { id: ++nextNoticeId, scope, message: userMessage };
    if (fatalListeners.size === 0) {
      pendingNotices.push(notice);
      if (pendingNotices.length > 3) pendingNotices.shift();
    }
    for (const listener of fatalListeners) listener(notice);
  },
};

export function subscribeToFatalErrors(listener: FatalListener) {
  fatalListeners.add(listener);
  for (const notice of pendingNotices.splice(0)) listener(notice);
  return () => {
    fatalListeners.delete(listener);
  };
}
