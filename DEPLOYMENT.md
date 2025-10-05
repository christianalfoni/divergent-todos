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
- See the **macOS Code Signing & Notarization** section below for complete setup
- Unsigned builds work but show "app is damaged" error to users
- Requires Apple Developer account ($99/year)

### Firebase deployment fails
- Verify `FIREBASE_SERVICE_ACCOUNT_DIVERGENT_TODOS` secret is set
- Check Firebase project permissions
- Ensure billing is enabled for Firebase project

## Distribution

### Desktop App

Users download installers from GitHub Releases page:
- Releases page: `https://github.com/christianalfoni/divergent-todos/releases/latest`
- Platform detection can be added to marketing site

#### Direct Download Links

Use these **stable URLs** that always point to the latest release (no version numbers in URLs):

**macOS:**
```
https://github.com/christianalfoni/divergent-todos/releases/latest/download/Divergent.Todos-mac-arm64.dmg
https://github.com/christianalfoni/divergent-todos/releases/latest/download/Divergent.Todos-mac-x64.dmg
https://github.com/christianalfoni/divergent-todos/releases/latest/download/Divergent.Todos-mac-arm64.zip
https://github.com/christianalfoni/divergent-todos/releases/latest/download/Divergent.Todos-mac-x64.zip
```

**Windows:**
```
https://github.com/christianalfoni/divergent-todos/releases/latest/download/Divergent.Todos-win-x64.exe
```

**Linux:**
```
https://github.com/christianalfoni/divergent-todos/releases/latest/download/Divergent.Todos-linux-x64.AppImage
https://github.com/christianalfoni/divergent-todos/releases/latest/download/Divergent.Todos-linux-x64.deb
```

**Note:** These URLs use `/latest/` to automatically redirect to the newest release, so you can hardcode them in your website without updating after each release.

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

## macOS Code Signing & Notarization

### Overview

macOS requires apps distributed outside the Mac App Store to be **code signed** and **notarized** by Apple. Without this, users see a "damaged and can't be opened" error.

This project is configured to automatically sign and notarize macOS builds in the GitHub Actions workflow.

### Why It's Needed

- **Code Signing**: Proves the app comes from a verified Apple Developer
- **Notarization**: Apple scans and approves the app for malware
- **User Experience**: Users can install without security warnings or workarounds

### Prerequisites

1. **Apple Developer Account** - $99/year at https://developer.apple.com/programs/
2. **Developer ID Application Certificate** - For signing apps
3. **App-Specific Password** - For automated notarization
4. **Team ID** - Found in Apple Developer portal

### Setup Process

The complete setup guide is in [CODE_SIGNING.md](CODE_SIGNING.md), but here's the summary:

#### 1. Create Certificate (on your Mac)

1. Open **Keychain Access**
2. Menu: **Keychain Access → Certificate Assistant → Request a Certificate...**
3. Save Certificate Signing Request (CSR) to disk
4. Go to https://developer.apple.com/account/resources/certificates/list
5. Create **Developer ID Application** certificate (G2 Sub-CA)
6. Upload CSR and download the certificate
7. Double-click to install in Keychain
8. Export as `.p12` file with password

#### 2. Create App-Specific Password

1. Go to https://appleid.apple.com
2. Sign in → **Security** → **App-Specific Passwords**
3. Generate password for "Electron Builder Notarization"
4. Save the password (format: `xxxx-xxxx-xxxx-xxxx`)

#### 3. Add GitHub Secrets

Add these 5 secrets at https://github.com/christianalfoni/divergent-todos/settings/secrets/actions:

| Secret Name | Value | How to Get |
|------------|-------|------------|
| `APPLE_ID` | your@email.com | Your Apple Developer account email |
| `APPLE_APP_SPECIFIC_PASSWORD` | xxxx-xxxx-xxxx-xxxx | From appleid.apple.com (step 2) |
| `APPLE_TEAM_ID` | ABC1234XYZ | From developer.apple.com (top right, under your name) |
| `CSC_LINK` | (base64 string) | Run: `base64 -i certificate.p12 \| pbcopy` |
| `CSC_KEY_PASSWORD` | your-password | Password used when exporting .p12 |

### How It Works in CI/CD

The GitHub Actions workflow ([.github/workflows/electron-release.yml](.github/workflows/electron-release.yml)) automatically handles code signing:

#### Build Phase (macOS runner)

```yaml
- name: Package and publish Electron app
  env:
    APPLE_ID: ${{ secrets.APPLE_ID }}
    APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
    APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
    CSC_LINK: ${{ secrets.CSC_LINK }}
    CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
  run: pnpm run package -- --publish always
```

#### What Happens

1. **electron-builder** reads the configuration from `apps/desktop/package.json`:
   ```json
   {
     "mac": {
       "hardenedRuntime": true,
       "entitlements": "build/entitlements.mac.plist",
       "notarize": {
         "teamId": "${APPLE_TEAM_ID}"
       }
     },
     "afterSign": "build/notarize.js"
   }
   ```

2. **Signing Process**:
   - Decodes `CSC_LINK` to get the certificate
   - Signs the app with hardened runtime enabled
   - Applies entitlements from `build/entitlements.mac.plist`

3. **Notarization Process** (via `build/notarize.js`):
   - Submits signed app to Apple
   - Waits for Apple's approval (2-5 minutes)
   - Downloads notarization ticket
   - Staples ticket to the app

4. **Packaging**:
   - Creates DMG and ZIP files with signed, notarized app
   - Uploads to GitHub Release

### Configuration Files

**Entitlements** (`apps/desktop/build/entitlements.mac.plist`):
```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>com.apple.security.cs.allow-jit</key>
  <true/>
  <key>com.apple.security.cs.allow-unsigned-executable-memory</key>
  <true/>
  <key>com.apple.security.cs.disable-library-validation</key>
  <true/>
  <key>com.apple.security.network.client</key>
  <true/>
  <key>com.apple.security.network.server</key>
  <true/>
</dict>
</plist>
```

These entitlements allow Electron to run with hardened runtime (required for notarization).

**Notarization Script** (`apps/desktop/build/notarize.js`):
- Runs after signing (via `afterSign` hook)
- Uses `@electron/notarize` package
- Skips notarization if environment variables are missing (for local builds)
- Submits to Apple using `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, and `APPLE_TEAM_ID`

### Build Timeline

For a macOS build with notarization:

```
1. Install dependencies          (~2 minutes)
2. Build web app                 (~1 minute)
3. Build desktop app             (~1 minute)
4. Sign app                      (~30 seconds)
5. Notarize with Apple          (~2-5 minutes)  ← Added time
6. Create DMG/ZIP               (~1 minute)
7. Upload to release            (~1 minute)
────────────────────────────────────────────
Total: ~8-12 minutes (vs 6-7 without signing)
```

### Testing Signed Builds

After a release is created:

1. Download the DMG from GitHub Releases
2. Install the app
3. Try to open it
4. You should see: *"Divergent Todos is an app downloaded from the internet. Are you sure you want to open it?"*
5. Click **Open**
6. App launches normally ✅

**Without signing**, users would see: *"Divergent Todos is damaged and can't be opened. You should move it to the Trash."* ❌

### Verifying Notarization

To verify a notarized app:

```bash
# Check code signing
codesign -dv --verbose=4 /Applications/Divergent\ Todos.app

# Verify notarization
spctl -a -vv /Applications/Divergent\ Todos.app

# Check stapled ticket
stapler validate /Applications/Divergent\ Todos.app
```

### Troubleshooting

**"No identity found" error in CI**:
- Verify all 5 GitHub Secrets are set correctly
- Check `CSC_LINK` is the full base64 string (no truncation)
- Ensure `CSC_KEY_PASSWORD` matches your .p12 password

**Notarization fails**:
- Check `APPLE_ID` matches your Developer account email
- Verify `APPLE_APP_SPECIFIC_PASSWORD` (not your regular password)
- Confirm `APPLE_TEAM_ID` is correct (10-character code)
- Check Apple Developer account is active ($99/year paid)

**Notarization times out**:
- Normal: 2-5 minutes
- High traffic: up to 30 minutes
- Check status: `xcrun notarytool history --apple-id <email> --password <app-password> --team-id <team-id>`

**Local builds fail**:
- Local builds skip notarization if secrets aren't in environment
- To test locally, export the 5 environment variables in your terminal
- Or skip signing: `CSC_IDENTITY_AUTO_DISCOVERY=false pnpm package`

### Cost & Maintenance

- **Initial Setup**: 2-4 hours
- **Annual Cost**: $99 (Apple Developer Program)
- **Build Time**: +2-5 minutes per macOS build
- **Certificate Renewal**: Automatic with active membership
- **App-Specific Password**: Rotate annually (recommended)

### Platform Notes

- **Windows**: No code signing configured (would require separate Windows certificate ~$70-200/year)
- **Linux**: No signing required for AppImage/DEB distribution
- **macOS only**: Code signing only runs on macOS builds (automatic in workflow)

### Security Best Practices

- ✅ GitHub Secrets are encrypted and only accessible to workflows
- ✅ Never commit `.p12` files or passwords to Git
- ✅ Use App-Specific Password (not your main Apple ID password)
- ✅ Enable two-factor authentication on Apple ID
- ✅ Rotate App-Specific Password annually
- ✅ Restrict workflow permissions to necessary actions only

### Alternative: Document Workaround

If you choose not to set up code signing (no $99 Apple Developer account), users can bypass the security warning:

```bash
xattr -cr /Applications/Divergent\ Todos.app
```

Add this to your README/website for users who download unsigned builds.

## Future Enhancements

- **Windows code signing**: Add Windows certificate for signed Windows builds
- **Beta channel**: Create separate workflow for beta releases
- **Snapcraft**: Add Snap package for Linux
- **Microsoft Store**: Distribute via Windows Store
- **Delta updates**: Enable differential updates to reduce download size
