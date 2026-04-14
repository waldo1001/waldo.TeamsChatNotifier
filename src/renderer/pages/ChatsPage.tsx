import React, { useState } from 'react';
import { useAppStore } from '../store/app-store';
import { TenantSection } from '../components/TenantSection';
import { DeviceCodeModal } from '../components/DeviceCodeModal';
import { ipc } from '../api/ipc-client';
import { sortChatsUnreadFirst, teamsAppLink } from '@shared/deep-links';
import type { Chat } from '@shared/types';

export function ChatsPage(): React.ReactElement {
  const { tenants, chatsByTenant, settings, syncingTenants, errorTenants, deviceCodeInfo, setDeviceCodeInfo, updateChatsForTenant } = useAppStore();
  const [search, setSearch] = useState('');
  const [addingAccount, setAddingAccount] = useState(false);

  const ageCutoffIso = settings.chatMaxAgeDays > 0
    ? new Date(Date.now() - settings.chatMaxAgeDays * 24 * 60 * 60 * 1000).toISOString()
    : null;

  function filterAndSortChats(chats: Chat[]): Chat[] {
    let result = chats;
    if (ageCutoffIso) {
      result = result.filter(c => !c.lastMessageAt || c.lastMessageAt >= ageCutoffIso);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(c => {
        const name = c.topic ?? c.memberNames.join(' ');
        const preview = c.lastMessagePreviewText ?? '';
        return name.toLowerCase().includes(q) || preview.toLowerCase().includes(q);
      });
    }
    return sortChatsUnreadFirst(result);
  }

  async function handleAddAccount() {
    setAddingAccount(true);
    try {
      await ipc.auth.startDeviceCode();
    } catch (err) {
      console.error('Device code flow failed:', err);
    } finally {
      setDeviceCodeInfo(null);
      setAddingAccount(false);
    }
  }

  async function handleCancelDeviceCode() {
    await ipc.auth.cancelDeviceCode();
    setDeviceCodeInfo(null);
    setAddingAccount(false);
  }

  if (tenants.length === 0) {
    return (
      <div style={styles.empty}>
        {deviceCodeInfo && (
          <DeviceCodeModal
            userCode={deviceCodeInfo.userCode}
            verificationUri={deviceCodeInfo.verificationUri}
            expiresIn={deviceCodeInfo.expiresIn}
            onCancel={handleCancelDeviceCode}
          />
        )}
        <div style={styles.emptyIcon}>💬</div>
        <p style={styles.emptyTitle}>No accounts connected</p>
        <p style={styles.emptyHint}>Add your Microsoft 365 account to get started.</p>
        <button
          style={styles.addBtn}
          onClick={handleAddAccount}
          disabled={addingAccount}
        >
          {addingAccount ? 'Signing in…' : 'Add Account'}
        </button>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.searchBar}>
        <input
          type="text"
          placeholder="Search chats…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={styles.searchInput}
        />
      </div>
      <div style={styles.list}>
        {tenants.map(tenant => (
          <TenantSection
            key={tenant.id}
            tenant={tenant}
            chats={filterAndSortChats(chatsByTenant[tenant.id] ?? [])}
            currentUserDisplayName={tenant.userPrincipalName.split('@')[0]}
            isSyncing={syncingTenants.has(tenant.id)}
            errorMessage={errorTenants[tenant.id]}
            onResync={() => ipc.chats.resyncTenant(tenant.id)}
            onOpen={(webUrl, chat) => {
              ipc.chats.openInTeams(teamsAppLink(webUrl), chat.id, chat.tenantId);
              // Update local state immediately so unread dot disappears
              const updated = (chatsByTenant[tenant.id] ?? []).map(c =>
                c.id === chat.id ? { ...c, lastReadAt: new Date().toISOString() } : c
              );
              updateChatsForTenant(tenant.id, updated);
            }}
            onOpenWeb={(webUrl, chat) => {
              ipc.chats.openInTeams(webUrl, chat.id, chat.tenantId);
              const updated = (chatsByTenant[tenant.id] ?? []).map(c =>
                c.id === chat.id ? { ...c, lastReadAt: new Date().toISOString() } : c
              );
              updateChatsForTenant(tenant.id, updated);
            }}
            onMarkRead={(chat) => {
              // Optimistic update — remove unread indicator immediately
              const updated = (chatsByTenant[tenant.id] ?? []).map(c =>
                c.id === chat.id ? { ...c, lastReadAt: new Date().toISOString() } : c
              );
              updateChatsForTenant(tenant.id, updated);
              ipc.chats.markRead(chat.id, chat.tenantId);
            }}
          />
        ))}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  searchBar: {
    padding: '8px 12px',
    borderBottom: '1px solid #1e1e3a',
    backgroundColor: '#16213e',
  },
  searchInput: {
    width: '100%',
    backgroundColor: '#0d0d20',
    border: '1px solid #2a2a4e',
    borderRadius: '6px',
    color: '#d0d8f0',
    fontSize: '13px',
    padding: '6px 10px',
    outline: 'none',
    boxSizing: 'border-box',
  },
  list: {
    flex: 1,
    overflowY: 'auto',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    padding: '32px',
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: '40px',
    marginBottom: '12px',
  },
  emptyTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: '#8090b8',
    margin: '0 0 8px',
  },
  emptyHint: {
    fontSize: '12px',
    color: '#505070',
    margin: '0 0 16px',
  },
  addBtn: {
    backgroundColor: '#2a4a8e',
    border: 'none',
    borderRadius: '6px',
    color: '#e0e8ff',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '8px 20px',
    fontWeight: 600,
  },
};
