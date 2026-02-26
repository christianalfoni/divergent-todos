# Divergent Todos

> When tasks converge like storm clouds gray,
> And overwhelm steals the day away,
> This gentle tool will guide you through,
> Breaking mountains into steps for you.
> 
> Each todo small, a victory won,
> Progress made when day is done.
> For scattered minds that need some peace,
> May your mental chaos find release.

Todos for those that feel overwhelmed

An Electron + Vite + React + Firebase + Tailwind CSS application for managing todos.

## Architecture

This project follows a secure architecture pattern:

- **Renderer (apps/web)**: Vite React app with Firebase Web SDK, Tailwind CSS
- **Main Process (apps/desktop)**: Electron main process and preload scripts
- **Security**: Uses `contextIsolation`, `nodeIntegration: false`, and `sandbox: true`

Firebase Web SDK is used in the renderer (not Admin SDK) to maintain security. All privileged operations should be implemented as Cloud Functions.

## Setup

1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Configure Firebase:**
   - Copy `.env.example` to `.env`
   - Fill in your Firebase project credentials

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
