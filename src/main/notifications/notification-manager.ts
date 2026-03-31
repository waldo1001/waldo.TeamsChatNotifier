import { Notification, app } from 'electron';
import path from 'path';
import type { Message, Chat, Tenant } from '../../shared/types';
import { truncate } from '../../shared/deep-links';

export class NotificationManager {
  private enabled = true;
  private showPreview = true;

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  setShowPreview(show: boolean): void {
    this.showPreview = show;
  }

  notify(message: Message, chat: Chat, tenant: Tenant, onOpen: () => void): void {
    if (!this.enabled) return;
    if (!Notification.isSupported()) return;

    const senderName = message.senderDisplayName ?? 'Someone';
    const chatName = this.getChatDisplayName(chat);

    const body = this.showPreview
      ? truncate(message.bodyContent, 80)
      : 'New message';

    const notification = new Notification({
      title: `${senderName} — ${chatName}`,
      body,
      subtitle: tenant.displayName,  // macOS only
      icon: path.join(app.isPackaged ? process.resourcesPath : '', 'assets', 'notification-icon.png'),
      silent: false,
    });

    notification.on('click', onOpen);
    notification.show();
  }

  private getChatDisplayName(chat: Chat): string {
    if (chat.topic) return chat.topic;
    if (chat.memberNames.length === 2) {
      // 1:1: show the other person — but we don't know current user here,
      // so show all members joined
      return chat.memberNames.join(', ');
    }
    return chat.memberNames.slice(0, 3).join(', ');
  }
}
