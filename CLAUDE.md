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
│   │   │   ├── firebase/       # Firebase integration
│   │   │   │   └── index.ts    # Firebase Web SDK initialization & config
│   │   │   ├── App.tsx         # Main React component
│   │   │   ├── main.tsx        # React entry point
│   │   │   ├── App.css         # Component styles
│   │   │   ├── index.css       # Global styles (Tailwind)
│   │   │   └── vite-env.d.ts   # Vite type declarations
│   │   ├── public/             # Static assets
│   │   ├── .firebaserc         # Firebase project configuration
│   │   ├── firebase.json       # Firebase deployment configuration
│   │   ├── firestore.indexes.json  # Firestore composite indexes
│   │   ├── firestore.rules     # Firestore security rules
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

### Firebase Configuration
- `/apps/web/.firebaserc` - Firebase project ID and aliases
- `/apps/web/firebase.json` - Firebase deployment settings (Functions, Firestore)
- `/apps/web/firestore.indexes.json` - Composite indexes for Firestore queries
- `/apps/web/firestore.rules` - Firestore security rules
- `/apps/web/src/firebase/index.ts` - Firebase Web SDK initialization (auth, db, functions)

### Application Code
- `/apps/desktop/src/main/main.ts` - Electron main process entry point
- `/apps/desktop/src/preload/preload.ts` - Secure IPC bridge
- `/apps/desktop/src/types/ipc.d.ts` - TypeScript types for window.native API

## Available Scripts

From root directory:
- `pnpm dev:web` - Start web dev server (Vite)
- `pnpm dev:desktop` - Start Electron app
- `pnpm build:web` - Build web app for production
- `pnpm build:desktop` - Build desktop app for production
- `pnpm typecheck` - Run TypeScript type checking across all packages

## Type Checking

When making changes to the codebase, always run `pnpm typecheck` to check for TypeScript errors before committing. Fix any type errors that are reported.

## Firebase Integration

### Firebase Services
Firebase services initialized in `/apps/web/src/firebase/index.ts`:
- **Authentication** (`auth`) - User authentication
- **Firestore** (`db`) - NoSQL database
- **Functions** (`functions`) - Cloud functions for privileged operations
- **App Check** - (Commented out, optional for production)

Configuration uses public Firebase config (safe for client-side).

### Firebase Configuration Files
All Firebase configuration files are located in `/apps/web/`:
- `.firebaserc` - Project configuration (project ID: `divergent-todos`)
- `firebase.json` - Deployment configuration
- `firestore.indexes.json` - Composite indexes (synced with Firebase console)
- `firestore.rules` - Security rules

**Important**: Firebase CLI commands must be run from the `/apps/web/` directory or use `--config apps/web/firebase.json` flag.

**Common Firebase Commands**:
```bash
cd apps/web
firebase firestore:indexes              # View current indexes
firebase deploy --only firestore:rules  # Deploy security rules
firebase deploy --only firestore:indexes # Deploy indexes
firebase deploy --only functions        # Deploy cloud functions
```

## Security Considerations

1. **Never include Firebase Admin SDK** in Electron app
2. **All privileged operations** should use Cloud Functions
3. **Environment variables** with `VITE_` prefix are bundled into renderer
4. **Preload script** is the only bridge between Electron and renderer
5. **Firestore Security Rules** should be configured server-side

## Versioning and Releases

### Version Management
- **Desktop app version** is managed in the **root** `package.json`
- The desktop app inherits this version via `electron-builder.config.js` (`extraMetadata.version`)
- GitHub Actions workflow reads from root `package.json` to determine release version
- **To release a new desktop version**: Bump the version in the root `package.json`

### Auto-Updates
- Desktop app uses `electron-updater` to check for updates from GitHub Releases
- Updates are published when:
  1. Version in root `package.json` is bumped
  2. Code is merged to `main` branch
  3. GitHub Actions builds and publishes with `--publish always`
- The workflow generates metadata files (`latest-mac.yml`, `latest-linux.yml`, `latest.yml`)
- These metadata files are uploaded to GitHub Releases alongside installers
- `electron-updater` reads these files to detect available updates
- Update notification appears in the app's top bar when new version is available

### Release Process
1. Bump version in root `package.json` (e.g., `npm version patch`)
2. Commit and push to `main`
3. GitHub Actions automatically:
   - Builds for all platforms (macOS, Windows, Linux)
   - Creates GitHub Release with tag `v{version}` (if tag doesn't exist)
   - Uploads installers and update metadata files
4. Existing desktop app users see update notification on next launch

## Activity Tracking

### Week Numbering System
The app uses **sequential week numbering** that increments throughout the entire year:

- **Week numbers range from 1-52** (or 53 in rare cases) for the entire year
- **Week 1** = the first Monday-Friday in January (may be partial if Jan 1 is not Monday)
- **Week 2** = the second Monday-Friday, etc.
- **Weeks start on Monday** and end on Friday (weekends excluded)
- **This is NOT ISO week numbering** - weeks align with calendar year boundaries
- Activity data is stored per week with 5-day arrays (Mon-Fri)

**Implementation**: Uses `getSequentialWeek()` utility function in `apps/web/src/utils/activity.ts`

**Example**: 2025
- Week 1 = Wed Jan 1 - Fri Jan 3, 2025 (partial week, 3 days)
- Week 2 = Mon Jan 6 - Fri Jan 10, 2025 (full week)
- Week 3 = Mon Jan 13 - Fri Jan 17, 2025
- ...
- Week 42 = Mon Oct 20 - Fri Oct 24, 2025
- ...
- Week 52 = Mon Dec 22 - Fri Dec 26, 2025
- Week 53 = Mon Dec 29 - Wed Dec 31, 2025 (partial week, 3 days)

**Current week** (Oct 22, 2025) = **Week 42**

**Firestore Schema**:
```typescript
activity/{docId}
  userId: string
  year: number
  week: number          // Sequential week number (1-53) for the entire year
  month: number         // Month number (0-11) for grouping
  completedTodos: Array<{
    date: string        // ISO date string
    text: string        // Todo text (HTML with tags)
    createdAt: string   // ISO date string
    completedAt: string // ISO date string
    moveCount: number
    completedWithTimeBox: boolean
    hasUrl: boolean
    tags: string[]
  }>
  incompleteCount: number      // Number of incomplete todos from the week
  aiSummary?: string           // Formal summary for heatmap view
  aiPersonalSummary?: string   // Personal summary for motivation
  aiSummaryGeneratedAt?: Timestamp
```

**Note**: When generating AI summaries, the system queries all todos (completed and incomplete) from the Monday of the target week onwards. Only completed todos are stored in the activity document, but incomplete todos are included in the AI analysis to provide context about remaining work and upcoming priorities.

### AI Summaries
Weekly activity summaries are generated using OpenAI GPT-4o-mini:
- **Formal Summary**: Professional overview identifying main focus areas and work momentum (3-4 sentences)
- **Personal Summary**: Supportive coaching highlighting achievements and upcoming work (3-4 sentences)
- Generated via admin script: `admin.scripts.generateWeekSummary(userId, week, year, customAnalysisInstructions?)`
- Custom analysis instructions can be passed to experiment with different prompt styles
- Only accessible to admin UID: `iaSsqsqb99Zemast8LN3dGCxB7o2`

## Development Notes

- Use **pnpm** for all package management (enforced by packageManager field)
- Web app can run standalone for rapid development
- Electron loads from `http://localhost:5173` in dev mode
- TypeScript strict mode enabled across all packages
- ESLint configured for React best practices
- **DO NOT run the dev server** - the user will always test changes themselves
