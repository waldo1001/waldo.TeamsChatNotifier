/**
 * Build Microsoft Teams deep links.
 * Always prefer chat.webUrl from the Graph API when available — it is already
 * tenant-scoped. These builders are fallbacks for when webUrl is absent.
 */

import type { Chat } from './types';

/**
 * Deep link to open a chat thread in Teams.
 * Format: https://teams.microsoft.com/l/chat/{encodedChatId}/0?tenantId={tenantId}
 */
export function chatDeepLink(chatId: string, tenantId: string): string {
  if (!chatId) throw new Error('chatId is required');
  if (!tenantId) throw new Error('tenantId is required');
  const encodedChatId = encodeURIComponent(chatId);
  return `https://teams.microsoft.com/l/chat/${encodedChatId}/0?tenantId=${tenantId}`;
}

/**
 * Deep link to jump to a specific message within a chat.
 */
export function messageDeepLink(
  chatId: string,
  messageId: string,
  tenantId: string,
): string {
  if (!chatId) throw new Error('chatId is required');
  if (!messageId) throw new Error('messageId is required');
  if (!tenantId) throw new Error('tenantId is required');
  const encodedChatId = encodeURIComponent(chatId);
  const context = encodeURIComponent(JSON.stringify({ contextType: 'chat' }));
  return `https://teams.microsoft.com/l/message/${encodedChatId}/${messageId}?context=${context}&tenantId=${tenantId}`;
}

/**
 * Strip HTML tags from a message body for use in notifications and previews.
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Truncate a string for notification previews.
 */
export function truncate(text: string, maxLength = 100): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/**
 * Convert a Teams web URL to an msteams:// protocol link that opens
 * the Teams desktop app directly.
 */
export function teamsAppLink(webUrl: string): string {
  if (!webUrl.startsWith('https://teams.microsoft.com')) return webUrl;
  return webUrl.replace('https://', 'msteams://');
}

/**
 * Sort chats with unread first, then by lastMessageAt descending within
 * each group. Does not mutate the input array.
 */
export function sortChatsUnreadFirst(chats: Chat[]): Chat[] {
  return [...chats].sort((a, b) => {
    const aUnread = isUnread(a);
    const bUnread = isUnread(b);
    if (aUnread !== bUnread) return aUnread ? -1 : 1;
    // Within same group, sort by most recent message first
    const aTime = a.lastMessageAt ?? '';
    const bTime = b.lastMessageAt ?? '';
    return bTime.localeCompare(aTime);
  });
}

function isUnread(chat: Chat): boolean {
  if (!chat.lastMessageAt) return false;
  if (!chat.lastReadAt) return true;
  return chat.lastMessageAt > chat.lastReadAt;
}
