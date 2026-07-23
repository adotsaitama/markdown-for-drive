import { useCallback, useEffect, useState } from "react";

export type Route = "home" | "editor" | "not-found";

function resolveRoute(pathname: string, search: string): Route {
  // Drive launches the SPA at the root with a serialized `state` query.
  if (new URLSearchParams(search).has("state")) return "editor";
  if (pathname === "/") return "home";
  if (pathname === "/editor" || pathname === "/editor/") return "editor";
  return "not-found";
}

export function useRouter() {
  const [route, setRoute] = useState<Route>(() =>
    resolveRoute(window.location.pathname, window.location.search),
  );

  useEffect(() => {
    const handlePopState = () =>
      setRoute(resolveRoute(window.location.pathname, window.location.search));
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  const navigate = useCallback((path: string) => {
    window.history.pushState({}, "", path);
    setRoute(resolveRoute(window.location.pathname, window.location.search));
  }, []);

  return { route, navigate };
}
