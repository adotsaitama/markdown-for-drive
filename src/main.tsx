import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import App from "./App";
import {
  FatalErrorBoundary,
  FatalErrorHost,
} from "./components/FatalErrorHost";
import "./styles/index.css";

const queryClient = new QueryClient();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <FatalErrorBoundary>
        <App />
      </FatalErrorBoundary>
      <FatalErrorHost />
    </QueryClientProvider>
  </StrictMode>,
);
