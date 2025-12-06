const { readFileSync } = require('fs');
const { resolve } = require('path');

// Read version from root package.json
const rootPackage = JSON.parse(
  readFileSync(resolve(__dirname, '../../package.json'), 'utf-8')
);

module.exports = {
  appId: 'com.divergent.todos',
  productName: 'Divergent Todos',
  extraMetadata: {
    version: rootPackage.version,
  },
  directories: {
    output: 'release',
  },
  files: ['dist-electron/**/*', '!dist-electron/renderer/**/*'],
  extraResources: [
    {
      from: '../web/dist',
      to: 'web',
      filter: ['**/*'],
    },
  ],
  publish: {
    provider: 'github',
    owner: 'christianalfoni',
    repo: 'divergent-todos',
  },
  mac: {
    category: 'public.app-category.productivity',
    icon: 'resources/icons/icon.icns',
    hardenedRuntime: true,
    gatekeeperAssess: false,
    entitlements: 'build/entitlements.mac.plist',
    entitlementsInherit: 'build/entitlements.mac.plist',
    notarize: false,
    target: [
      {
        target: 'dmg',
        arch: ['arm64'],
      },
      {
        target: 'dmg',
        arch: ['x64'],
      },
      {
        target: 'zip',
        arch: ['arm64'],
      },
      {
        target: 'zip',
        arch: ['x64'],
      },
    ],
    artifactName: 'Divergent-Todos-mac-${arch}.${ext}',
  },
  win: {
    icon: 'resources/icons/icon.ico',
    target: ['nsis', 'portable'],
    // Code signing configuration
    // Option A: Azure Trusted Signing (uncomment and configure)
    // azureSignOptions: {
    //   endpoint: 'https://eus.codesigning.azure.net',
    //   codeSigningAccountName: process.env.AZURE_SIGNING_ACCOUNT_NAME,
    //   certificateProfileName: process.env.AZURE_SIGNING_CERTIFICATE_PROFILE,
    // },
    // Option B: Traditional certificate (uses environment variables)
    // CSC_LINK and CSC_KEY_PASSWORD (or WIN_CSC_LINK/WIN_CSC_KEY_PASSWORD)
    // Option C: EV Certificate (uncomment and configure)
    // certificateSubjectName: 'Your Company Name',
  },
  nsis: {
    oneClick: false, // Show installation directory choice
    allowToChangeInstallationDirectory: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: 'Divergent Todos',
    runAfterFinish: true, // Launch app after installation
    artifactName: 'Divergent-Todos-Setup-${arch}.${ext}', // Clearly named as setup
  },
  portable: {
    artifactName: 'Divergent-Todos-Standalone-${arch}.${ext}', // Clearly named as standalone
  },
  linux: {
    icon: 'resources/icons/icon.icns',
    target: ['AppImage', 'deb'],
    category: 'Utility',
    artifactName: 'Divergent-Todos-linux-${arch}.${ext}',
  },
  afterSign: 'build/notarize.js',
};
