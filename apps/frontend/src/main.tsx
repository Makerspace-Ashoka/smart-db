import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import SmartApp from "./SmartApp";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SmartApp />
  </StrictMode>,
);
