import type { Configuration } from 'electron-builder';

const config: Configuration = {
  appId: 'com.teamschatnotifier.app',
  productName: 'Teams Chat Notifier',
  copyright: `Copyright © ${new Date().getFullYear()}`,
  directories: {
    output: 'dist/packages',
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
    target: [
      { target: 'dmg', arch: ['x64', 'arm64'] },
      { target: 'zip', arch: ['x64', 'arm64'] },
    ],
    hardenedRuntime: true,
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
