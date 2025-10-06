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
    artifactName: '${productName}-mac-${arch}.${ext}',
  },
  win: {
    target: ['nsis', 'portable'],
    artifactName: '${productName}-win-${arch}.${ext}',
  },
  linux: {
    target: ['AppImage', 'deb'],
    category: 'Utility',
    artifactName: '${productName}-linux-${arch}.${ext}',
  },
  afterSign: 'build/notarize.js',
};
