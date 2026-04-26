# Divergent Todos

Todos for those that feel overwhelmed

An Electron + Vite + React + Firebase + Tailwind CSS application for managing todos.

## Architecture

This project follows a secure architecture pattern:

- **Renderer (apps/web)**: Vite React app with Firebase Web SDK, Tailwind CSS
- **Main Process (apps/desktop)**: Electron main process and preload scripts
- **Security**: Uses `contextIsolation`, `nodeIntegration: false`, and `sandbox: true`

Firebase Web SDK is used in the renderer (not Admin SDK) to maintain security. All privileged operations should be implemented as Cloud Functions.

## Setup

### Prerequisites

- **Node.js 22** (see `.nvmrc`). The `functions/` workspace requires Node 22 for Firebase deploys; using a different major version will produce an `Unsupported engine` warning on `pnpm install`.
- **pnpm 10+** (see the `packageManager` field in root `package.json`).

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

   Native postinstall scripts for trusted packages (esbuild, `@tailwindcss/oxide`, etc.) are pre-allowlisted in root `package.json` under `pnpm.onlyBuiltDependencies`. No `pnpm approve-builds` step is required.

2. **Environment variables (optional for build/typecheck):**

   Firebase web config is hardcoded in `apps/web/src/firebase/index.ts`, so `pnpm install`, `pnpm build:web`, and `pnpm typecheck` work with no `.env` file.

   You only need an env file for specific workflows:

   - **E2E tests / dev test-user button**: create `apps/web/.env.local` with `VITE_DEV_MODE_SECRET=...` (must match the Firebase secret of the same name). See [E2E-TESTING.md](./E2E-TESTING.md) for the full setup.
   - **PostHog analytics in dev**: add `VITE_POSTHOG_API_KEY` and `VITE_POSTHOG_HOST` to `apps/web/.env.local`.

   See `apps/web/.env.example` for the variables that are actually consumed.

3. **Development:**

   Run both dev servers in separate terminals:

   ```bash
   # Terminal 1 - Start web dev server
   pnpm dev:web

   # Terminal 2 - Start Electron
   pnpm dev:desktop
   ```

4. **Build:**
   ```bash
   pnpm build:web
   pnpm build:desktop
   ```

## Testing

The repo has two separate test suites:

- **Unit tests (Vitest)** — fast, no external services required:
  ```bash
  pnpm test                            # CI mode (vitest run)
  pnpm --filter web test               # watch mode
  ```
  Unit tests live next to source as `src/**/*.test.ts(x)`. Vitest is configured to ignore the Playwright `tests/e2e/**` directory.

- **End-to-end tests (Playwright)** — require Firebase Functions deployed and `VITE_DEV_MODE_SECRET` set:
  ```bash
  pnpm --filter web exec playwright test
  ```
  See [E2E-TESTING.md](./E2E-TESTING.md) for the full setup (Firebase secrets, Stripe test mode, GitHub Actions config).

## Project Structure

```
divergent-todos/
├── apps/
│   ├── web/              # Vite + React + Tailwind (renderer)
│   │   ├── src/
│   │   │   ├── firebase.ts    # Firebase Web SDK initialization
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   └── package.json
│   └── desktop/          # Electron app
│       ├── src/
│       │   ├── main/          # Main process
│       │   ├── preload/       # Preload scripts
│       │   └── types/         # TypeScript definitions
│       └── package.json
├── .env                  # Environment variables (not committed)
├── .env.example          # Example environment variables
└── package.json          # Workspace root
```

## Security Notes

- Firebase Admin SDK should **NOT** be included in the Electron app
- All privileged operations should go through Firebase Cloud Functions
- The preload script exposes a minimal, typed API surface
- Environment variables with `VITE_` prefix are bundled into the renderer

## Next Steps

1. Set up your Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Configure Firebase Authentication
3. Set up Firestore Security Rules
4. Implement Cloud Functions for privileged operations (optional)
