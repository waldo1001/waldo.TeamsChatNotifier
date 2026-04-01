import { Tray, Menu, app, nativeImage } from 'electron';
import path from 'path';

export class TrayManager {
  private tray: Tray | null = null;
  private unreadCounts = new Map<string, number>();
  private onShow: () => void;
  private onQuit: () => void;

  constructor(onShow: () => void, onQuit: () => void) {
    this.onShow = onShow;
    this.onQuit = onQuit;
  }

  create(): void {
    const iconPath = path.join(
      app.isPackaged ? app.getAppPath() : path.join(__dirname, '../../..'),
      'assets',
      'tray-icon.png',
    );

    // Fallback to empty image if asset doesn't exist yet (dev mode)
    let icon: Electron.NativeImage;
    try {
      icon = nativeImage.createFromPath(iconPath);
    } catch {
      icon = nativeImage.createEmpty();
    }

    this.tray = new Tray(icon);
    this.tray.setToolTip('Teams Chat Notifier');

    this.tray.on('click', () => this.onShow());
    this.tray.on('double-click', () => this.onShow());

    this.updateContextMenu();
  }

  updateUnreadCount(tenantId: string, count: number): void {
    this.unreadCounts.set(tenantId, count);
    const total = Array.from(this.unreadCounts.values()).reduce((a, b) => a + b, 0);

    if (this.tray) {
      if (process.platform === 'darwin') {
        this.tray.setTitle(total > 0 ? String(total) : '');
      }
      if (app.dock && process.platform === 'darwin') {
        if (total > 0) {
          app.dock.setBadge(String(total));
          app.dock.bounce('informational');
        } else {
          app.dock.setBadge('');
        }
      }
    }

    this.updateContextMenu();
  }

  destroy(): void {
    this.tray?.destroy();
    this.tray = null;
  }

  private updateContextMenu(): void {
    if (!this.tray) return;

    const total = Array.from(this.unreadCounts.values()).reduce((a, b) => a + b, 0);

    const menu = Menu.buildFromTemplate([
      {
        label: total > 0 ? `Teams Chat Notifier (${total} unread)` : 'Teams Chat Notifier',
        enabled: false,
      },
      { type: 'separator' },
      { label: 'Open', click: () => this.onShow() },
      { type: 'separator' },
      { label: 'Quit', click: () => this.onQuit() },
    ]);

    this.tray.setContextMenu(menu);
  }
}
