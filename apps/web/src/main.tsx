import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { CacheProvider } from "pipesy";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CacheProvider>
      <App />
    </CacheProvider>
  </StrictMode>
);
