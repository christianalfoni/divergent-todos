import { defineConfig } from "vite";
import tailwindcss from "@tailwindcss/vite";
import { raskPlugin } from "rask-ui/plugin";

// Read version from root package.json
import { readFileSync } from "fs";
import { resolve } from "path";
const packageJson = JSON.parse(
  readFileSync(resolve(__dirname, "../../package.json"), "utf-8")
);

// https://vite.dev/config/
export default defineConfig({
  plugins: [raskPlugin(), tailwindcss()],
  base: "./", // Use relative paths for Electron
  define: {
    "import.meta.env.VITE_APP_VERSION": JSON.stringify(packageJson.version),
  },
});
