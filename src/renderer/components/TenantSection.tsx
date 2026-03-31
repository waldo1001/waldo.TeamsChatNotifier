import React, { useState } from 'react';
import type { Tenant, Chat } from '@shared/types';
import { ChatListItem } from './ChatListItem';

interface Props {
  tenant: Tenant;
  chats: Chat[];
  currentUserDisplayName: string;
  onOpen: (webUrl: string, chat: Chat) => void;
}

function countUnread(chats: Chat[]): number {
  return chats.filter(c => {
    if (!c.lastMessageAt) return false;
    if (!c.lastReadAt) return true;
    return c.lastMessageAt > c.lastReadAt;
  }).length;
}

export function TenantSection({
  tenant,
  chats,
  currentUserDisplayName,
  onOpen,
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
        {unreadCount > 0 && (
          <span data-testid="unread-badge" style={styles.badge}>
            {unreadCount}
          </span>
        )}
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
  chatList: {},
  empty: {
    padding: '16px',
    textAlign: 'center',
    color: '#505070',
    fontSize: '12px',
  },
};
