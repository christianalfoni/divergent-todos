import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { CacheProvider } from "pipesy";
import ErrorBoundary from "./ErrorBoundary.tsx";
import "./firebase/admin"; // Load admin tools for console access

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <CacheProvider>
      <App />
    </CacheProvider>
  </ErrorBoundary>
);
