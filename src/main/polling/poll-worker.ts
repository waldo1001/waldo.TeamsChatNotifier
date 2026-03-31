import { stripHtml } from '../../shared/deep-links';
import type { Chat, Message } from '../../shared/types';

// ── Types for Graph API responses ──────────────────────────────────────────

export interface GraphChatMessage {
  id: string;
  messageType?: string;
  from?: { user?: { id?: string; displayName?: string } | null } | null;
  body?: { content?: string; contentType?: string };
  createdDateTime?: string;
}

export interface GraphChat {
  id: string;
  chatType?: string;
  topic?: string | null;
  webUrl?: string | null;
  lastMessagePreview?: {
    createdDateTime?: string;
    body?: { content?: string };
    from?: { user?: { displayName?: string } | null } | null;
  } | null;
  viewpoint?: {
    lastMessageReadDateTime?: string | null;
    isHidden?: boolean;
  } | null;
  members?: Array<{ displayName?: string; [key: string]: unknown }>;
}

// ── Pure functions ─────────────────────────────────────────────────────────

/**
 * Given fetched Graph chats and locally stored chats, return only the Graph
 * chats whose lastMessagePreview.createdDateTime is newer than stored, or
 * that don't exist in the store yet.
 */
export function detectChangedChats(
  fetched: GraphChat[],
  stored: Chat[],
): GraphChat[] {
  const storedMap = new Map<string, string | null>(
    stored.map(c => [c.id, c.lastMessageAt]),
  );

  return fetched.filter(graphChat => {
    const newTs = graphChat.lastMessagePreview?.createdDateTime;
    if (!newTs) return false; // no message preview — skip

    const storedTs = storedMap.get(graphChat.id);
    if (storedTs === undefined) return true;  // new chat not in store
    if (storedTs === null) return true;        // never had a message, now has one
    return newTs > storedTs;                   // ISO strings are lexicographically comparable
  });
}

/**
 * Determine whether a Graph message should trigger an OS notification.
 */
export function shouldNotify(
  message: GraphChatMessage,
  currentUserId: string,
  alreadyNotified: boolean,
): boolean {
  if (alreadyNotified) return false;
  if (message.messageType !== 'message') return false;
  if (!message.from?.user?.id) return false;           // system or anonymous
  if (message.from.user.id === currentUserId) return false; // sent by us
  return true;
}

/**
 * Map a raw Graph API chatMessage response to our internal Message type.
 */
export function buildMessageFromGraphResponse(
  raw: GraphChatMessage,
  chatId: string,
  tenantId: string,
): Message {
  const rawContent = raw.body?.content ?? '';
  const contentType = raw.body?.contentType ?? 'text';
  const bodyContent = contentType === 'html' ? stripHtml(rawContent) : rawContent;

  return {
    id: raw.id,
    chatId,
    tenantId,
    senderId: raw.from?.user?.id ?? null,
    senderDisplayName: raw.from?.user?.displayName ?? null,
    bodyContent,
    createdAt: raw.createdDateTime ?? new Date().toISOString(),
    isSystemMessage: raw.messageType !== 'message',
    notified: false,
  };
}

/**
 * Map a raw Graph API chat response to our internal Chat type.
 */
export function buildChatFromGraphResponse(
  raw: GraphChat,
  tenantId: string,
): Chat {
  const members = (raw.members ?? [])
    .map(m => m.displayName)
    .filter((n): n is string => typeof n === 'string' && n.length > 0);

  return {
    id: raw.id,
    tenantId,
    chatType: (raw.chatType as Chat['chatType']) ?? 'unknownFutureValue',
    topic: raw.topic ?? null,
    memberNames: members,
    lastMessagePreviewText: raw.lastMessagePreview?.body?.content
      ? stripHtml(raw.lastMessagePreview.body.content)
      : null,
    lastMessagePreviewSender:
      raw.lastMessagePreview?.from?.user?.displayName ?? null,
    lastMessageAt: raw.lastMessagePreview?.createdDateTime ?? null,
    lastReadAt: raw.viewpoint?.lastMessageReadDateTime ?? null,
    isHidden: raw.viewpoint?.isHidden ?? false,
    webUrl: raw.webUrl ?? null,
    lastPolledAt: null,
    updatedAt: new Date().toISOString(),
  };
}
