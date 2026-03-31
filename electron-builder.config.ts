import type { Configuration } from 'electron-builder';
import { execSync } from 'child_process';
import path from 'path';

// When CSC_LINK is set, electron-builder handles signing with the real certificate.
// When not set, we ad-hoc sign in afterSign to prevent "damaged app" errors.
const hasRealCertificate = !!process.env.CSC_LINK;

const config: Configuration = {
  appId: 'com.teamschatnotifier.app',
  productName: 'Teams Chat Notifier',
  copyright: `Copyright © ${new Date().getFullYear()}`,
  afterSign: async (context) => {
    if (context.electronPlatformName !== 'darwin') return;
    if (hasRealCertificate) return; // Already signed by electron-builder

    const appPath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.app`);
    console.log(`  • ad-hoc signing (no certificate found)  app=${appPath}`);
    // Sign all Mach-O binaries bottom-up, then frameworks, then the .app
    execSync(
      `find "${appPath}" -type f -perm +111 -exec codesign --force --sign - {} \\; 2>/dev/null; ` +
      `find "${appPath}/Contents/Frameworks" -depth -name "*.framework" -exec codesign --force --sign - {} \\; 2>/dev/null; ` +
      `find "${appPath}/Contents/Frameworks" -depth -name "*.app" -exec codesign --force --sign - {} \\; 2>/dev/null; ` +
      `codesign --force --sign - "${appPath}"`,
      { stdio: 'inherit' },
    );
  },
  ...(hasRealCertificate ? {} : { forceCodeSigning: false }),
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
    // With a real cert (CSC_LINK), electron-builder auto-discovers identity.
    // Without one, set identity to null to skip built-in signing (ad-hoc handled in afterSign).
    ...(hasRealCertificate ? { hardenedRuntime: true } : { identity: null, hardenedRuntime: false }),
    target: [
      { target: 'dmg', arch: ['x64', 'arm64'] },
      { target: 'zip', arch: ['x64', 'arm64'] },
    ],
    gatekeeperAssess: false,
    notarize: hasRealCertificate ? { teamId: process.env.APPLE_TEAM_ID || '' } : false,
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
