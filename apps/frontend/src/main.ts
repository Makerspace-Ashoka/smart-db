import "@fontsource-variable/fraunces";
import "@fontsource/ibm-plex-sans/400.css";
import "@fontsource/ibm-plex-sans/500.css";
import "@fontsource/ibm-plex-sans/600.css";
import "@fontsource/ibm-plex-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";

import "./styles.css";
import { startRewriteApp } from "./rewrite/app-controller";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Could not find #root");
}

startRewriteApp(root);

