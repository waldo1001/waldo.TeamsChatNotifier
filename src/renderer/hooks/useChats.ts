import { useEffect } from 'react';
import { useAppStore } from '../store/app-store';
import {
  onChatsUpdated,
  onTenantAuthState,
  onDeviceCodeReady,
  onSyncStatus,
  ipc,
} from '../api/ipc-client';

export function useChats() {
  const {
    setTenants,
    updateChatsForTenant,
    setAuthState,
    setDeviceCodeInfo,
    setSyncing,
    setError,
    removeTenant,
  } = useAppStore();

  // Load initial data
  useEffect(() => {
    ipc.chats.getAll().then(({ tenants, chatsByTenant }) => {
      setTenants(tenants);
      for (const [tenantId, chats] of Object.entries(chatsByTenant)) {
        updateChatsForTenant(tenantId, chats);
      }
    }).catch(console.error);
  }, []);

  // Subscribe to push events
  useEffect(() => {
    const unsubChats = onChatsUpdated(({ tenantId, chats }) => {
      updateChatsForTenant(tenantId, chats);
    });

    const unsubAuth = onTenantAuthState((state) => {
      setAuthState(state);
      if (state.status === 'signed-in') {
        // Refresh tenant list
        ipc.tenants.getAll().then(setTenants).catch(console.error);
      } else if (state.status === 'signing-out') {
        removeTenant(state.tenantId);
      }
    });

    const unsubDeviceCode = onDeviceCodeReady((info) => {
      setDeviceCodeInfo(info);
    });

    const unsubSync = onSyncStatus((status) => {
      setSyncing(status.tenantId, status.status === 'syncing');
      setError(status.tenantId, status.status === 'error' ? (status.errorMessage ?? 'Sync error') : null);
    });

    return () => {
      unsubChats();
      unsubAuth();
      unsubDeviceCode();
      unsubSync();
    };
  }, []);
}
