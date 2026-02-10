# Desktop App Architecture Guide: Context Interface Pattern for Electron

## Overview
This is an Electron 35 desktop application using the **Context Interface Pattern** to separate application logic from Electron APIs and native system integrations.

## Technology Stack
- **Runtime**: Electron 35
- **Build Tool**: Vite 7 with vite-plugin-electron
- **Auto-Updates**: electron-updater
- **Language**: TypeScript
- **Security**: Context isolation, sandboxing, secure IPC

## Core Architectural Principles

### 1. Context Interface Pattern for Electron
The application follows strict separation between application logic and Electron/Node.js APIs:

**Application Layer** (main process logic, IPC handlers):
- Contains pure TypeScript logic describing *what* happens
- Never directly imports Node.js modules in business logic
- Only depends on interface types, never Electron implementation types

**Context Interface Layer** (system integrations):
- Implements *how* things occur (file system, native APIs, OS integration)
- Manages all Electron APIs and Node.js dependencies
- Transforms between Electron types and application types

### 2. Secure IPC Architecture

**CRITICAL**: Follow Electron security best practices:

✅ **Security Model**:
- ✅ Context isolation enabled
- ✅ Node integration disabled
- ✅ Sandbox enabled
- ✅ Preload script provides minimal, typed API
- ✅ No direct Node.js access from renderer

**IPC Pattern**:

```typescript
// src/types/ipc.d.ts - Define application types (not Electron types)
export interface NativeAPI {
  getVersion(): Promise<string>;
  checkForUpdates(): Promise<UpdateInfo | null>;
  downloadUpdate(): Promise<void>;
  installUpdate(): void;

  // File operations
  selectFile(options: FileSelectOptions): Promise<string | null>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;

  // Window operations
  minimizeWindow(): void;
  maximizeWindow(): void;
  closeWindow(): void;
}

// Application types (no Electron types leaked)
export interface UpdateInfo {
  version: string;
  releaseDate: string;
  releaseNotes: string;
}

export interface FileSelectOptions {
  title?: string;
  filters?: Array<{ name: string; extensions: string[] }>;
  defaultPath?: string;
}

declare global {
  interface Window {
    native: NativeAPI;
  }
}
```

### 3. Context Design for Electron

Define contexts for different system capabilities:

```typescript
// System context interface
interface SystemContext {
  getAppVersion(): string;
  getPlatform(): 'darwin' | 'win32' | 'linux';
  openExternal(url: string): Promise<void>;
  showNotification(title: string, body: string): void;
}

// Update context interface
interface UpdateContext {
  checkForUpdates(): Promise<UpdateInfo | null>;
  downloadUpdate(): Promise<void>;
  installUpdate(): void;
  onUpdateAvailable(callback: (info: UpdateInfo) => void): () => void;
  onUpdateDownloaded(callback: () => void): () => void;
}

// File system context interface
interface FileSystemContext {
  selectFile(options: FileSelectOptions): Promise<string | null>;
  selectDirectory(options: DirectorySelectOptions): Promise<string | null>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
}
```

**AVOID** exposing raw Electron/Node APIs:
- ❌ `getElectronApp()`
- ❌ `getDialog()`
- ❌ `require(moduleName)`
- ❌ `executeNodeCode(code)`

### 4. Implementation Guidelines

**Main Process (src/main/main.ts)**:

```typescript
import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import { autoUpdater } from 'electron-updater';

// Context implementation for updates
class ElectronUpdateContext implements UpdateContext {
  private window: BrowserWindow;

  constructor(window: BrowserWindow) {
    this.window = window;
  }

  async checkForUpdates(): Promise<UpdateInfo | null> {
    try {
      const result = await autoUpdater.checkForUpdates();
      if (!result) return null;

      // Transform Electron types to application types
      return {
        version: result.updateInfo.version,
        releaseDate: result.updateInfo.releaseDate,
        releaseNotes: result.updateInfo.releaseNotes || ''
      };
    } catch (error) {
      console.error('Update check failed:', error);
      return null;
    }
  }

  async downloadUpdate(): Promise<void> {
    await autoUpdater.downloadUpdate();
  }

  installUpdate(): void {
    autoUpdater.quitAndInstall();
  }

  onUpdateAvailable(callback: (info: UpdateInfo) => void): () => void {
    const handler = (info: any) => {
      callback({
        version: info.version,
        releaseDate: info.releaseDate,
        releaseNotes: info.releaseNotes || ''
      });
    };

    autoUpdater.on('update-available', handler);
    return () => autoUpdater.off('update-available', handler);
  }

  // ... other methods
}

// IPC handler setup
function setupIpcHandlers(window: BrowserWindow) {
  const updateContext = new ElectronUpdateContext(window);
  const fileSystemContext = new ElectronFileSystemContext(window);

  ipcMain.handle('app:getVersion', () => app.getVersion());

  ipcMain.handle('updates:check', () => updateContext.checkForUpdates());
  ipcMain.handle('updates:download', () => updateContext.downloadUpdate());
  ipcMain.handle('updates:install', () => updateContext.installUpdate());

  ipcMain.handle('fs:selectFile', (_, options) =>
    fileSystemContext.selectFile(options)
  );
}
```

**Preload Script (src/preload/preload.ts)**:

```typescript
import { contextBridge, ipcRenderer } from 'electron';
import type { NativeAPI } from '../types/ipc';

// Expose minimal, typed API to renderer
const nativeAPI: NativeAPI = {
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  checkForUpdates: () => ipcRenderer.invoke('updates:check'),
  downloadUpdate: () => ipcRenderer.invoke('updates:download'),
  installUpdate: () => ipcRenderer.invoke('updates:install'),

  selectFile: (options) => ipcRenderer.invoke('fs:selectFile', options),
  readFile: (path) => ipcRenderer.invoke('fs:readFile', path),
  writeFile: (path, content) => ipcRenderer.invoke('fs:writeFile', path, content),

  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
};

contextBridge.exposeInMainWorld('native', nativeAPI);
```

### 5. Testing Strategy

**Main Process Tests**:
```typescript
import { describe, it, expect, vi } from 'vitest';
import type { BrowserWindow } from 'electron';

describe('ElectronUpdateContext', () => {
  it('should check for updates', async () => {
    const mockWindow = {} as BrowserWindow;
    const mockAutoUpdater = {
      checkForUpdates: vi.fn().mockResolvedValue({
        updateInfo: {
          version: '1.2.0',
          releaseDate: '2025-01-15',
          releaseNotes: 'Bug fixes'
        }
      })
    };

    const context = new ElectronUpdateContext(mockWindow, mockAutoUpdater);
    const result = await context.checkForUpdates();

    expect(result).toEqual({
      version: '1.2.0',
      releaseDate: '2025-01-15',
      releaseNotes: 'Bug fixes'
    });
  });
});
```

**Renderer Tests** (test native API calls):
```typescript
describe('UpdateNotification', () => {
  it('should check for updates on mount', async () => {
    const mockNative: NativeAPI = {
      checkForUpdates: vi.fn().mockResolvedValue({
        version: '1.2.0',
        releaseDate: '2025-01-15',
        releaseNotes: 'Bug fixes'
      }),
      // ... other methods
    };

    // Mock window.native
    vi.stubGlobal('native', mockNative);

    render(<UpdateNotification />);

    await waitFor(() => {
      expect(mockNative.checkForUpdates).toHaveBeenCalled();
    });
  });
});
```

## Anti-Patterns to Avoid

1. **Disabling security features**:
   ```typescript
   // ❌ Never do this
   const window = new BrowserWindow({
     webPreferences: {
       nodeIntegration: true,
       contextIsolation: false,
       sandbox: false
     }
   });
   ```

2. **Exposing raw Node.js/Electron to renderer**:
   ```typescript
   // ❌ Never do this
   contextBridge.exposeInMainWorld('electron', {
     require: require,
     dialog: dialog,
     fs: require('fs')
   });
   ```

3. **Leaking Electron types to application code**:
   ```typescript
   // ❌ Never do this
   import { UpdateInfo } from 'electron-updater';

   interface AppUpdate {
     info: UpdateInfo; // Leaked Electron type
   }
   ```

4. **Synchronous IPC**:
   ```typescript
   // ❌ Avoid synchronous IPC (blocks renderer)
   ipcMain.on('sync-call', (event) => {
     event.returnValue = 'result';
   });

   // ✅ Use async IPC with handle/invoke
   ipcMain.handle('async-call', async () => {
     return 'result';
   });
   ```

5. **Business logic in IPC handlers**:
   ```typescript
   // ❌ Keep IPC handlers thin
   ipcMain.handle('complex-operation', async (_, data) => {
     // ❌ No complex business logic here
     const validated = validateData(data);
     const processed = processData(validated);
     const result = await saveData(processed);
     return result;
   });

   // ✅ Delegate to context implementation
   ipcMain.handle('complex-operation', (_, data) =>
     operationContext.executeOperation(data)
   );
   ```

## Project Structure

```
src/
├── main/                  # Main process (Electron APIs)
│   ├── main.ts           # Entry point, window creation, IPC setup
│   ├── contexts/         # Context implementations
│   │   ├── UpdateContext.ts
│   │   ├── FileSystemContext.ts
│   │   └── SystemContext.ts
│   └── utils/            # Main process utilities
├── preload/              # Preload scripts (IPC bridge)
│   └── preload.ts        # Exposes typed API to renderer
└── types/                # Shared type definitions
    └── ipc.d.ts          # NativeAPI interface
```

## Security Best Practices

1. **Always validate IPC input** in main process
2. **Never trust renderer data** - assume it's compromised
3. **Minimize preload API surface** - only expose what's needed
4. **Use typed IPC** - define interfaces for all IPC communication
5. **Never expose shell.openPath** without validation
6. **Sanitize file paths** before file system operations
7. **Use dialog for file selection** - never accept arbitrary paths

## Auto-Update Configuration

**Important**: Updates are managed at the root `package.json` level:
- Version in root `package.json` determines release version
- Merges to `main` trigger auto-builds via GitHub Actions
- `electron-updater` checks GitHub Releases for updates
- Update metadata files (`latest-mac.yml`, etc.) are auto-generated

## Benefits of This Architecture

1. **Security**: Strict separation prevents compromised renderer from accessing Node.js
2. **Testability**: Mock contexts enable testing without Electron runtime
3. **Type Safety**: No Electron type leakage ensures compile-time safety
4. **Maintainability**: Clear boundaries between system integrations and logic
5. **Portability**: Same patterns work across Electron, Tauri, or other runtimes

## Development Workflow

1. **Define IPC interface** in `types/ipc.d.ts`
2. **Create context implementation** in `main/contexts/`
3. **Add IPC handlers** in `main/main.ts`
4. **Expose API in preload** script
5. **Use `window.native` in renderer** (from web app)
6. **Test with mocks** for both main and renderer

## Scripts

- `pnpm dev` - Start Electron in development mode
- `pnpm build` - Build Electron app
- `pnpm typecheck` - Run TypeScript type checking
- `pnpm package` - Package app for distribution (local, no publish)
- `pnpm generate-icons` - Generate app icons from source image

## Important Notes

- Always run `pnpm typecheck` before committing
- Never disable security features (context isolation, sandbox)
- Keep IPC API surface minimal and typed
- All privileged operations should be in main process
- Use dialog APIs for file/folder selection
- Validate all renderer input in main process
- Use ISO strings for dates in IPC (not Date objects)
