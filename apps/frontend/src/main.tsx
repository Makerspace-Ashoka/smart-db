import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SmartApp from "./SmartApp";
import { AppErrorBoundary } from "./components/AppErrorBoundary";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AppErrorBoundary>
      <SmartApp />
    </AppErrorBoundary>
  </StrictMode>,
);
