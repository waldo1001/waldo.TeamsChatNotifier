import { create } from 'zustand';
import type { Tenant, Chat, AppSettings, TenantAuthState, DeviceCodeInfo } from '@shared/types';
import { DEFAULT_SETTINGS } from '@shared/types';

interface AppState {
  // Data
  tenants: Tenant[];
  chatsByTenant: Record<string, Chat[]>;
  settings: AppSettings;

  // Auth state per tenant
  authStates: Record<string, TenantAuthState>;

  // UI state
  deviceCodeInfo: DeviceCodeInfo | null;
  syncingTenants: Set<string>;
  errorTenants: Record<string, string>;

  // Actions
  setTenants: (tenants: Tenant[]) => void;
  updateChatsForTenant: (tenantId: string, chats: Chat[]) => void;
  setSettings: (settings: AppSettings) => void;
  setAuthState: (state: TenantAuthState) => void;
  setDeviceCodeInfo: (info: DeviceCodeInfo | null) => void;
  setSyncing: (tenantId: string, syncing: boolean) => void;
  setError: (tenantId: string, error: string | null) => void;
  removeTenant: (tenantId: string) => void;
}

export const useAppStore = create<AppState>((set) => ({
  tenants: [],
  chatsByTenant: {},
  settings: DEFAULT_SETTINGS,
  authStates: {},
  deviceCodeInfo: null,
  syncingTenants: new Set(),
  errorTenants: {},

  setTenants: (tenants) => set({ tenants }),

  updateChatsForTenant: (tenantId, chats) =>
    set(state => ({
      chatsByTenant: { ...state.chatsByTenant, [tenantId]: chats },
    })),

  setSettings: (settings) => set({ settings }),

  setAuthState: (authState) =>
    set(state => ({
      authStates: { ...state.authStates, [authState.tenantId]: authState },
    })),

  setDeviceCodeInfo: (info) => set({ deviceCodeInfo: info }),

  setSyncing: (tenantId, syncing) =>
    set(state => {
      const next = new Set(state.syncingTenants);
      if (syncing) next.add(tenantId);
      else next.delete(tenantId);
      return { syncingTenants: next };
    }),

  setError: (tenantId, error) =>
    set(state => {
      const next = { ...state.errorTenants };
      if (error === null) delete next[tenantId];
      else next[tenantId] = error;
      return { errorTenants: next };
    }),

  removeTenant: (tenantId) =>
    set(state => {
      const tenants = state.tenants.filter(t => t.id !== tenantId);
      const chatsByTenant = { ...state.chatsByTenant };
      delete chatsByTenant[tenantId];
      const authStates = { ...state.authStates };
      delete authStates[tenantId];
      return { tenants, chatsByTenant, authStates };
    }),
}));
