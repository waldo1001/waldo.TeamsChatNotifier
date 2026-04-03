import React, { useState } from 'react';
import type { Tenant, Chat } from '@shared/types';
import { isUnread } from '@shared/deep-links';
import { ChatListItem } from './ChatListItem';

interface Props {
  tenant: Tenant;
  chats: Chat[];
  currentUserDisplayName: string;
  isSyncing?: boolean;
  onOpen: (webUrl: string, chat: Chat) => void;
  onOpenWeb: (webUrl: string, chat: Chat) => void;
  onMarkRead: (chat: Chat) => void;
  onResync?: () => void;
}

function countUnread(chats: Chat[]): number {
  return chats.filter(isUnread).length;
}

export function TenantSection({
  tenant,
  chats,
  currentUserDisplayName,
  isSyncing = false,
  onOpen,
  onOpenWeb,
  onMarkRead,
  onResync,
}: Props): React.ReactElement {
  const [expanded, setExpanded] = useState(true);
  const unreadCount = countUnread(chats);

  return (
    <div style={styles.section}>
      <div
        data-testid="tenant-header"
        style={styles.header}
        onClick={() => setExpanded(e => !e)}
        role="button"
        tabIndex={0}
        onKeyDown={e => e.key === 'Enter' && setExpanded(ex => !ex)}
        aria-expanded={expanded}
      >
        <div style={styles.headerLeft}>
          <span style={styles.chevron}>{expanded ? '▾' : '▸'}</span>
          <div>
            <div style={styles.tenantName}>{tenant.displayName}</div>
            <div style={styles.upn}>{tenant.userPrincipalName}</div>
          </div>
        </div>
        <div style={styles.headerRight}>
          {unreadCount > 0 && (
            <span data-testid="unread-badge" style={styles.badge}>
              {unreadCount}
            </span>
          )}
          {onResync && (
            <button
              style={{
                ...styles.resyncBtn,
                ...(isSyncing ? styles.resyncBtnSpinning : {}),
              }}
              onClick={e => { e.stopPropagation(); onResync(); }}
              disabled={isSyncing}
              title="Resync account"
              aria-label="Resync account"
            >
              ↺
            </button>
          )}
        </div>
      </div>

      {expanded && (
        <div style={styles.chatList}>
          {chats.length === 0 ? (
            <div style={styles.empty}>No chats found</div>
          ) : (
            chats.map(chat => (
              <ChatListItem
                key={`${chat.id}-${chat.tenantId}`}
                chat={chat}
                currentUserDisplayName={currentUserDisplayName}
                onOpen={onOpen}
                onOpenWeb={onOpenWeb}
                onMarkRead={onMarkRead}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    borderBottom: '2px solid #1e1e3a',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 14px',
    backgroundColor: '#16213e',
    cursor: 'pointer',
    userSelect: 'none',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  chevron: {
    fontSize: '12px',
    color: '#606080',
    width: '12px',
  },
  tenantName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#b0b8d8',
  },
  upn: {
    fontSize: '11px',
    color: '#606080',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  badge: {
    backgroundColor: '#6c9fe8',
    color: '#fff',
    borderRadius: '10px',
    padding: '1px 7px',
    fontSize: '11px',
    fontWeight: 700,
    minWidth: '18px',
    textAlign: 'center',
  },
  resyncBtn: {
    background: 'none',
    border: 'none',
    color: '#606080',
    cursor: 'pointer',
    fontSize: '14px',
    padding: '0 2px',
    lineHeight: 1,
    display: 'flex',
    alignItems: 'center',
  },
  resyncBtnSpinning: {
    opacity: 0.4,
    cursor: 'default',
  },
  chatList: {},
  empty: {
    padding: '16px',
    textAlign: 'center',
    color: '#505070',
    fontSize: '12px',
  },
};
