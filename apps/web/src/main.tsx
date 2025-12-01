import "./index.css";
import { App } from "./App.tsx";

import "./firebase/admin"; // Load admin tools for console access
import "./test-helpers"; // Load test helpers for E2E testing (dev only)
import { render } from "rask-ui";

render(<App />, document.getElementById("root")!);
