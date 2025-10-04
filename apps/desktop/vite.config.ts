import { defineConfig } from "vite";
import electron from "vite-plugin-electron/simple";

export default defineConfig({
  plugins: [
    electron({
      main: {
        entry: "src/main/main.ts",
      },
      preload: {
        input: "src/preload/preload.ts",
      },
    }),
  ],
  server: {
    port: 5174, // Different port from web app
  },
});
