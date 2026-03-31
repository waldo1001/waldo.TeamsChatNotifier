import type { Configuration } from 'electron-builder';
import { execSync } from 'child_process';
import path from 'path';

const config: Configuration = {
  appId: 'com.teamschatnotifier.app',
  productName: 'Teams Chat Notifier',
  copyright: `Copyright © ${new Date().getFullYear()}`,
  // afterSign runs after electron-builder's own signing step (which is skipped with identity: null),
  // ensuring no further modifications invalidate our ad-hoc signature before DMG creation.
  afterSign: async (context) => {
    if (context.electronPlatformName === 'darwin') {
      const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
      console.log(`  • ad-hoc signing  app=${appPath}`);
      // Sign all Mach-O binaries and bundles from deepest level up, then sign the .app
      execSync(
        `find "${appPath}" -type f -perm +111 -exec codesign --force --sign - {} \\; 2>/dev/null; ` +
        `find "${appPath}/Contents/Frameworks" -depth -name "*.framework" -exec codesign --force --sign - {} \\; 2>/dev/null; ` +
        `find "${appPath}/Contents/Frameworks" -depth -name "*.app" -exec codesign --force --sign - {} \\; 2>/dev/null; ` +
        `codesign --force --sign - "${appPath}"`,
        { stdio: 'inherit' },
      );
    }
  },
  directories: {
    output: 'release',
    buildResources: 'assets',
  },
  files: [
    'dist/main/**/*',
    'dist/renderer/**/*',
    'assets/**/*',
    'package.json',
  ],
  mac: {
    category: 'public.app-category.productivity',
    identity: null,
    target: [
      { target: 'dmg', arch: ['x64', 'arm64'] },
      { target: 'zip', arch: ['x64', 'arm64'] },
    ],
    hardenedRuntime: false,
    gatekeeperAssess: false,
    extendInfo: {
      // Hides from Dock and Cmd+Tab — pure tray app
      LSUIElement: true,
      NSUserNotificationAlertStyle: 'alert',
    },
  },
  win: {
    target: [{ target: 'nsis', arch: ['x64'] }],
    requestedExecutionLevel: 'asInvoker',
  },
  nsis: {
    oneClick: true,
    perMachine: false,
    allowToChangeInstallationDirectory: false,
    deleteAppDataOnUninstall: false,
  },
  linux: {
    target: ['AppImage'],
    category: 'Network',
  },
};

export default config;
