import { BrowserWindow, shell, nativeImage, app } from 'electron';
import path from 'path';

const isDev = !app.isPackaged;

export class WindowManager {
  private win: BrowserWindow | null = null;

  create(): BrowserWindow {
    const iconPath = path.join(
      app.isPackaged ? app.getAppPath() : path.join(__dirname, '../../..'),
      'assets',
      'icon.png',
    );

    this.win = new BrowserWindow({
      width: 420,
      height: 680,
      minWidth: 360,
      minHeight: 500,
      show: false,
      frame: true,
      backgroundColor: '#121220',
      icon: nativeImage.createFromPath(iconPath),
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        preload: path.join(__dirname, '../preload/preload.js'),
      },
      titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    });

    if (isDev) {
      const vitePort = process.env.VITE_DEV_PORT ?? '5173';
      this.win.loadURL(`http://localhost:${vitePort}`);
    } else {
      this.win.loadFile(path.join(__dirname, '../../renderer/index.html'));
    }

    this.win.once('ready-to-show', () => this.win?.show());

    // Intercept navigation — open external links in system browser
    this.win.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url);
      return { action: 'deny' };
    });

    // Hide instead of close
    this.win.on('close', e => {
      e.preventDefault();
      this.win?.hide();
    });

    this.win.on('closed', () => {
      this.win = null;
    });

    return this.win;
  }

  show(): void {
    if (!this.win) this.create();
    this.win?.show();
    this.win?.focus();
  }

  hide(): void {
    this.win?.hide();
  }

  toggle(): void {
    if (this.win?.isVisible()) {
      this.hide();
    } else {
      this.show();
    }
  }

  getWindow(): BrowserWindow | null {
    return this.win;
  }

  sendToRenderer(channel: string, ...args: unknown[]): void {
    if (this.win && !this.win.isDestroyed()) {
      this.win.webContents.send(channel, ...args);
    }
  }
}
