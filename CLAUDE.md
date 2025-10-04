# Repository Structure: Divergent Todos

## Overview
Divergent Todos is a secure Electron + React + Firebase todo application built with modern tooling. The project uses a pnpm workspace monorepo structure with separate web (renderer) and desktop (Electron) applications.

## Technology Stack
- **Frontend**: React 19, Vite 7, Tailwind CSS 4
- **Desktop**: Electron 35
- **Backend**: Firebase (Auth, Firestore, Functions)
- **Package Manager**: pnpm (workspace-based monorepo)
- **Language**: TypeScript

## Project Structure

```
divergent-todos/
├── apps/
│   ├── web/                    # Vite + React renderer (runs in Electron window)
│   │   ├── src/
│   │   │   ├── firebase.ts     # Firebase Web SDK initialization & config
│   │   │   ├── App.tsx         # Main React component
│   │   │   ├── main.tsx        # React entry point
│   │   │   ├── App.css         # Component styles
│   │   │   ├── index.css       # Global styles (Tailwind)
│   │   │   └── vite-env.d.ts   # Vite type declarations
│   │   ├── public/             # Static assets
│   │   ├── index.html          # HTML entry point
│   │   ├── vite.config.ts      # Vite configuration
│   │   ├── tsconfig.json       # TypeScript config
│   │   ├── eslint.config.js    # ESLint configuration
│   │   └── package.json        # Web app dependencies
│   │
│   └── desktop/                # Electron main process
│       ├── src/
│       │   ├── main/
│       │   │   └── main.ts     # Electron app entry, window creation, IPC handlers
│       │   ├── preload/
│       │   │   └── preload.ts  # Secure bridge between main and renderer
│       │   └── types/
│       │       └── ipc.d.ts    # TypeScript definitions for IPC API
│       ├── electron.vite.config.ts  # Electron Vite plugin config
│       ├── tsconfig.json       # TypeScript config
│       └── package.json        # Desktop app dependencies
│
├── pnpm-workspace.yaml         # Workspace configuration
├── package.json                # Root workspace scripts
├── README.md                   # User documentation
└── LICENSE
```

## Architecture

### Security Model
This project implements a secure Electron architecture:

- **Context Isolation**: Enabled (`contextIsolation: true`)
- **Node Integration**: Disabled (`nodeIntegration: false`)
- **Sandbox**: Enabled (`sandbox: true`)
- **Preload Script**: Provides minimal, typed API surface between main and renderer
- **Firebase Web SDK**: Used in renderer (NOT Admin SDK) for security
- **Privileged Operations**: Should be implemented as Firebase Cloud Functions

### Development Workflow

1. **Web App** (`apps/web/`):
   - Runs on Vite dev server (http://localhost:5173)
   - Can be developed standalone or loaded by Electron
   - Uses Firebase Web SDK for auth/database operations
   - Tailwind CSS for styling

2. **Desktop App** (`apps/desktop/`):
   - Main process manages Electron window lifecycle
   - Preload script exposes safe IPC API to renderer
   - Loads web app from Vite dev server (dev) or bundled files (production)
   - Handles native desktop integrations

3. **IPC Communication**:
   - Typed IPC handlers defined in `apps/desktop/src/main/main.ts`
   - Example: `app:getVersion` returns Electron app version
   - Preload script exposes typed API on `window.native`

## Key Files

### Configuration
- `/package.json` - Root workspace with dev/build scripts for both apps
- `/pnpm-workspace.yaml` - Defines workspace packages
- `/apps/web/vite.config.ts` - Vite configuration for renderer
- `/apps/desktop/electron.vite.config.ts` - Electron-specific Vite config

### Application Code
- `/apps/web/src/firebase.ts` - Firebase initialization (auth, db, functions)
- `/apps/desktop/src/main/main.ts` - Electron main process entry point
- `/apps/desktop/src/preload/preload.ts` - Secure IPC bridge
- `/apps/desktop/src/types/ipc.d.ts` - TypeScript types for window.native API

## Available Scripts

From root directory:
- `pnpm dev:web` - Start web dev server (Vite)
- `pnpm dev:desktop` - Start Electron app
- `pnpm build:web` - Build web app for production
- `pnpm build:desktop` - Build desktop app for production

## Firebase Integration

Firebase services initialized in `/apps/web/src/firebase.ts`:
- **Authentication** (`auth`) - User authentication
- **Firestore** (`db`) - NoSQL database
- **Functions** (`functions`) - Cloud functions for privileged operations
- **App Check** - (Commented out, optional for production)

Configuration uses public Firebase config (safe for client-side).

## Security Considerations

1. **Never include Firebase Admin SDK** in Electron app
2. **All privileged operations** should use Cloud Functions
3. **Environment variables** with `VITE_` prefix are bundled into renderer
4. **Preload script** is the only bridge between Electron and renderer
5. **Firestore Security Rules** should be configured server-side

## Development Notes

- Use **pnpm** for all package management (enforced by packageManager field)
- Web app can run standalone for rapid development
- Electron loads from `http://localhost:5173` in dev mode
- TypeScript strict mode enabled across all packages
- ESLint configured for React best practices
