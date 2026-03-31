import React from 'react';
import type { Chat } from '@shared/types';

interface Props {
  chat: Chat;
  currentUserDisplayName: string;
  onOpen: (webUrl: string, chat: Chat) => void;
}

function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return '';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function getChatName(chat: Chat, currentUserDisplayName: string): string {
  if (chat.chatType === 'oneOnOne') {
    const other = chat.memberNames.find((n: string) => n !== currentUserDisplayName);
    return other ?? chat.memberNames[0] ?? 'Unknown';
  }
  if (chat.topic) return chat.topic;
  // Group with no topic — list other members
  const others = chat.memberNames.filter((n: string) => n !== currentUserDisplayName);
  return others.join(', ') || chat.memberNames.join(', ');
}

function isUnread(chat: Chat): boolean {
  if (!chat.lastMessageAt) return false;
  if (!chat.lastReadAt) return true;
  return chat.lastMessageAt > chat.lastReadAt;
}

export function ChatListItem({ chat, currentUserDisplayName, onOpen }: Props): React.ReactElement {
  const chatName = getChatName(chat, currentUserDisplayName);
  const unread = isUnread(chat);

  return (
    <div style={styles.item}>
      <div style={styles.avatar}>
        <span style={styles.avatarText}>
          {chatName.charAt(0).toUpperCase()}
        </span>
      </div>

      <div style={styles.content}>
        <div style={styles.header}>
          <span style={{ ...styles.name, ...(unread ? styles.nameUnread : {}) }}>
            {chatName}
          </span>
          <span data-testid="chat-timestamp" style={styles.timestamp}>
            {formatRelativeTime(chat.lastMessageAt)}
          </span>
        </div>

        {chat.lastMessagePreviewText && (
          <div style={styles.preview}>
            {chat.lastMessagePreviewSender && (
              <span style={styles.sender}>{chat.lastMessagePreviewSender}: </span>
            )}
            <span style={styles.previewText}>{chat.lastMessagePreviewText}</span>
          </div>
        )}
      </div>

      <div style={styles.actions}>
        {unread && (
          <div data-testid="unread-indicator" style={styles.unreadDot} />
        )}
        <button
          aria-label="Open in Teams"
          style={styles.openBtn}
          onClick={() => onOpen(chat.webUrl ?? '', chat)}
          title="Open in Teams"
        >
          ↗
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  item: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 14px',
    cursor: 'default',
    borderBottom: '1px solid #1e1e3a',
    transition: 'background 0.1s',
  },
  avatar: {
    width: '36px',
    height: '36px',
    borderRadius: '50%',
    backgroundColor: '#3a3a6e',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  avatarText: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#a0a8d8',
  },
  content: {
    flex: 1,
    minWidth: 0,
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2px',
  },
  name: {
    fontSize: '13px',
    fontWeight: 400,
    color: '#c0c8e0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  nameUnread: {
    fontWeight: 700,
    color: '#e8eeff',
  },
  timestamp: {
    fontSize: '11px',
    color: '#606080',
    flexShrink: 0,
    marginLeft: '8px',
  },
  preview: {
    fontSize: '12px',
    color: '#8080a0',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  sender: {
    fontWeight: 600,
    color: '#9090b8',
  },
  previewText: {},
  actions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '4px',
    flexShrink: 0,
  },
  unreadDot: {
    width: '8px',
    height: '8px',
    borderRadius: '50%',
    backgroundColor: '#6c9fe8',
  },
  openBtn: {
    background: 'none',
    border: '1px solid #3a3a6e',
    borderRadius: '4px',
    color: '#8090c0',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '2px 6px',
    lineHeight: 1,
  },
};
