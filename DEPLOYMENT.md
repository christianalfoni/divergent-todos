# Deployment Guide

This document describes how Divergent Todos is built and deployed across different platforms.

## Architecture Overview

Divergent Todos consists of three deployable components:

1. **Web App** - React frontend deployed to Firebase Hosting
2. **Cloud Functions** - Backend API deployed to Firebase Functions
3. **Desktop App** - Electron application distributed via GitHub Releases

## Deployment Triggers

All deployments are automated via GitHub Actions when code is merged to the `main` branch.

### Web App Deployment

**Workflow**: [`.github/workflows/firebase-hosting-merge.yml`](.github/workflows/firebase-hosting-merge.yml)

**Triggers on**: Push to `main` branch (when web code changes)

**Deployment Behavior**:
- Checks if tag `web-v{version}` exists
- If tag exists: Skips deployment (logs message)
- If tag is new: Builds and deploys to Firebase Hosting
- After successful deployment, creates tag `web-v{version}`
- **To deploy**: Bump version in `apps/web/package.json` first

**Process**:
1. Extract version from `apps/web/package.json`
2. Check if `web-v{version}` tag exists
3. If new version:
   - Install dependencies with pnpm
   - Build web app: `pnpm build:web`
   - Deploy to Firebase Hosting via `FirebaseExtended/action-hosting-deploy`
   - Create version tag
4. Requires secret: `FIREBASE_SERVICE_ACCOUNT_DIVERGENT_TODOS`

**Result**: Web app available at Firebase Hosting URL (configured in Firebase project)

### Desktop App Release

**Workflow**: [`.github/workflows/electron-release.yml`](.github/workflows/electron-release.yml)

**Triggers on**: Push to `main` branch (when desktop/web code changes)

**Release Behavior**:
- Builds are **always** created on every merge to main (when relevant files change)
- GitHub Release is **only created** if the version tag doesn't already exist
- Example: If tag `v1.0.0` exists, builds run but no new release is published
- **To publish a new release**: Bump the version in `apps/desktop/package.json` first

**Process**:

#### Build Phase (Parallel)
Runs on three operating systems simultaneously:
- **macOS** (macos-latest)
- **Ubuntu** (ubuntu-latest)
- **Windows** (windows-latest)

For each platform:
1. Install dependencies: `pnpm install --frozen-lockfile`
2. Build web app: `pnpm build:web`
3. Build Electron: `pnpm build:desktop`
4. Package with electron-builder: `pnpm package`
5. Upload platform-specific artifacts

#### Release Phase (Sequential)
After all builds complete:
1. Extract version from `apps/desktop/package.json`
2. Check if tag `v{version}` already exists
3. If tag exists: Skip release creation (logs message)
4. If tag is new:
   - Download all artifacts from build jobs
   - Create GitHub Release with tag `v{version}`
   - Attach all platform binaries to release
   - Auto-generate release notes from commits

**Artifacts Produced**:
- **macOS**: `.dmg` (installer), `.zip` (portable)
- **Windows**: `.exe` (NSIS installer), `.exe` (portable)
- **Linux**: `.AppImage` (portable), `.deb` (Debian package)

**Result**: GitHub Release created at `https://github.com/USERNAME/divergent-todos/releases/tag/v{version}`

## electron-builder Configuration

Located in [`apps/desktop/package.json`](apps/desktop/package.json) under the `"build"` key.

### Key Settings

```json
{
  "appId": "com.divergent.todos",
  "productName": "Divergent Todos",
  "directories": {
    "output": "release"
  }
}
```

### File Inclusion

- **Electron code**: `dist-electron/**/*` (main process + preload)
- **Web app**: `../web/dist` → packaged as `resources/web/`
- Production loads from: `process.resourcesPath/web/index.html`

### Platform Targets

**macOS**:
- Category: Productivity
- Formats: DMG (drag-to-install), ZIP (portable)
- Naming: `Divergent Todos-{version}-mac-{arch}.{ext}`

**Windows**:
- Formats: NSIS (installer with shortcuts), Portable (no install)
- Naming: `Divergent Todos-{version}-win-{arch}.{ext}`

**Linux**:
- Category: Utility
- Formats: AppImage (universal portable), DEB (Debian/Ubuntu)
- Naming: `Divergent Todos-{version}-linux-{arch}.{ext}`

## Versioning Strategy

The web app and desktop app have **independent versions**:

- **Web App**: Version in `apps/web/package.json` (tags: `web-v0.0.0`)
- **Desktop App**: Version in `apps/desktop/package.json` (tags: `v1.0.0`)

This allows you to:
- Deploy web updates without releasing a new desktop version
- Release desktop updates independently of web deployment
- Version components based on their actual changes

**Example scenarios**:

```bash
# Web-only update (bug fix in React component)
cd apps/web
npm version patch  # 0.0.0 → 0.0.1
# Merge to main → deploys web, no desktop release

# Desktop-only update (Electron security update)
cd apps/desktop
npm version patch  # 1.0.0 → 1.0.1
# Merge to main → releases desktop installers, no web deployment

# Both need updates
cd apps/web && npm version minor
cd ../desktop && npm version minor
# Merge to main → both deploy/release
```

## Creating a New Release

### Web App Deployment (Automatic)

1. Bump version in `apps/web/package.json`:
   ```bash
   cd apps/web
   npm version patch  # or minor, or major
   ```

2. Commit and push to main:
   ```bash
   git add apps/web/package.json
   git commit -m "chore: bump web version to X.Y.Z"
   git push origin main
   ```

3. GitHub Actions will automatically deploy to Firebase Hosting

### Desktop App Release (Automatic)

1. Bump version in `apps/desktop/package.json`:
   ```bash
   cd apps/desktop
   npm version patch  # or minor, or major
   ```

2. Commit and push to main:
   ```bash
   git add apps/desktop/package.json
   git commit -m "chore: bump desktop version to X.Y.Z"
   git push origin main
   ```

3. GitHub Actions will automatically:
   - Build for all platforms
   - Create release with tag `vX.Y.Z`
   - Attach all installers

### Manual Release (Local Testing)

Build for your current platform only:

```bash
# From root
pnpm install
pnpm build:web
pnpm build:desktop

# Package
cd apps/desktop
pnpm package
```

Binaries will be in `apps/desktop/release/`

## Manual Deployment

### Web App

```bash
# Install Firebase CLI if needed
npm install -g firebase-tools

# Login
firebase login

# Deploy
pnpm build:web
cd apps/web
firebase deploy --only hosting
```

### Cloud Functions

```bash
cd functions
npm run deploy
# or
firebase deploy --only functions
```

## Environment Variables

### Build-time (Web App)
Stored in `apps/web/.env` (not committed):
- `VITE_*` variables are bundled into the app
- Used for Firebase config, API keys, etc.

### Runtime (GitHub Actions)
Stored in GitHub repository secrets:
- `FIREBASE_SERVICE_ACCOUNT_DIVERGENT_TODOS` - For web deployment
- `GITHUB_TOKEN` - Automatically provided for releases

## Requirements

- **pnpm**: 10.9.0 (defined in `.github/workflows`)
- **Node.js**: 20.x
- **Platforms**:
  - macOS: For building Mac apps (requires macOS runner)
  - Linux: For Linux builds
  - Windows: For Windows builds

## Troubleshooting

### Release not created
- Check version in `package.json` doesn't already exist as a tag
- Verify `GITHUB_TOKEN` has release permissions
- Check workflow logs in GitHub Actions tab

### Wrong files in package
- Verify `apps/web/dist` exists before packaging
- Check `extraResources` in electron-builder config
- Test locally with `pnpm package`

### macOS code signing issues
- For signed releases, add Apple Developer certificates to GitHub secrets
- See electron-builder documentation for `mac.identity` configuration
- Unsigned builds work but show security warnings

### Firebase deployment fails
- Verify `FIREBASE_SERVICE_ACCOUNT_DIVERGENT_TODOS` secret is set
- Check Firebase project permissions
- Ensure billing is enabled for Firebase project

## Distribution

### Desktop App

Users download installers from GitHub Releases page:
- Releases page: `https://github.com/USERNAME/divergent-todos/releases/latest`
- Platform detection can be added to marketing site

#### Direct Download Links

Use these **stable URLs** that always point to the latest release (no version numbers in URLs):

**macOS:**
```
https://github.com/USERNAME/divergent-todos/releases/latest/download/Divergent%20Todos-mac-arm64.dmg
https://github.com/USERNAME/divergent-todos/releases/latest/download/Divergent%20Todos-mac-x64.dmg
https://github.com/USERNAME/divergent-todos/releases/latest/download/Divergent%20Todos-mac-arm64.zip
https://github.com/USERNAME/divergent-todos/releases/latest/download/Divergent%20Todos-mac-x64.zip
```

**Windows:**
```
https://github.com/USERNAME/divergent-todos/releases/latest/download/Divergent%20Todos-win-x64.exe
```

**Linux:**
```
https://github.com/USERNAME/divergent-todos/releases/latest/download/Divergent%20Todos-linux-x64.AppImage
https://github.com/USERNAME/divergent-todos/releases/latest/download/Divergent%20Todos-linux-x64.deb
```

**Note:** Replace `USERNAME` with your actual GitHub username. These URLs automatically redirect to the newest release, so you can hardcode them in your website without updating after each release.

### Web App
Accessible directly via Firebase Hosting URL:
- Can be embedded as PWA
- Users can install via browser "Add to Home Screen"
- Desktop app loads this same codebase

## Auto-Updates

The desktop app includes **automatic update checking** using `electron-updater`.

### How It Works

1. **Automatic Checks**: App checks for updates 3 seconds after launch (production only)
2. **GitHub Releases**: Updates are distributed via GitHub Releases
3. **Update Metadata**: electron-builder generates `.yml` files containing update info
4. **User Control**: Updates are not auto-downloaded; user decides when to update

### Update Flow

```
App Launch → Check GitHub Releases → Update Available?
                                            ↓
                                           Yes → User sees notification
                                            ↓
                                    User clicks Download
                                            ↓
                                    Download in background
                                            ↓
                                    User clicks Install
                                            ↓
                                    App quits and installs
                                            ↓
                                    New version launches
```

### Technical Details

**Configuration** (`apps/desktop/package.json`):
```json
{
  "publish": {
    "provider": "github",
    "owner": "YOUR_GITHUB_USERNAME",
    "repo": "divergent-todos"
  }
}
```

**Update Files Generated**:
- `latest-mac.yml` - macOS update metadata
- `latest-linux.yml` - Linux update metadata
- `latest.yml` - Windows update metadata

These files are automatically uploaded to GitHub Releases by the CI workflow.

**API Available to Renderer**:
```typescript
window.native.updater.check()           // Manually check for updates
window.native.updater.download()        // Download available update
window.native.updater.install()         // Quit and install update

// Event listeners
window.native.updater.onAvailable((info) => {
  console.log('Update available:', info.version)
})
window.native.updater.onDownloadProgress((progress) => {
  console.log('Download progress:', progress.percent)
})
window.native.updater.onDownloaded((info) => {
  console.log('Update ready to install:', info.version)
})
```

### Creating an Update

1. Bump version in `apps/desktop/package.json`:
   ```bash
   cd apps/desktop
   npm version patch  # 1.0.0 → 1.0.1
   ```

2. Commit and push to main:
   ```bash
   git add apps/desktop/package.json
   git commit -m "chore: release desktop v1.0.1"
   git push origin main
   ```

3. GitHub Actions will:
   - Build all platform installers
   - Generate update metadata files (`.yml`)
   - Create GitHub Release with tag `v1.0.1`
   - Publish all artifacts

4. Users with v1.0.0 will:
   - See update notification on next app launch
   - Download and install v1.0.1 when ready

### Requirements

- GitHub repository must be **public** or users must have access
- Version in `package.json` must follow semver (e.g., `1.0.0`)
- `GH_TOKEN` must have release permissions (automatically provided in CI)

### Troubleshooting

**Update check fails**:
- Verify `publish.owner` and `publish.repo` in `package.json` are correct
- Check GitHub release exists with proper version tag
- Ensure `.yml` files were uploaded to release

**Update download fails**:
- Check user has internet connection
- Verify download URLs in `.yml` files are accessible
- Review auto-updater logs in developer console

**Update doesn't install**:
- Ensure app has write permissions
- Check user has admin/sudo rights (platform-dependent)
- Review Electron app quit process

## Future Enhancements

- **Code signing**: Add Apple Developer + Windows code signing certificates
- **Beta channel**: Create separate workflow for beta releases
- **Notarization**: Add macOS notarization for smoother user experience
- **Snapcraft**: Add Snap package for Linux
- **Microsoft Store**: Distribute via Windows Store
- **Delta updates**: Enable differential updates to reduce download size
