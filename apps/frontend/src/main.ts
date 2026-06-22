import "./fonts.css";
import "./styles.css";
import { registerPwa } from "./pwa";
import { startRewriteApp } from "./rewrite/app-controller";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Could not find #root");
}

startRewriteApp(root);
registerPwa();
