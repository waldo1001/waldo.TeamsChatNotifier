import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render } from '@testing-library/react';
import App from '../../src/renderer/App';
import { useAppStore } from '../../src/renderer/store/app-store';


// Mock the IPC client
vi.mock('../../src/renderer/api/ipc-client', () => ({
  ipc: {
    auth: { startDeviceCode: vi.fn(), cancelDeviceCode: vi.fn(), signOutTenant: vi.fn() },
    chats: {
      openInTeams: vi.fn(),
      getAll: vi.fn().mockResolvedValue({ tenants: [], chatsByTenant: {} }),
    },
    settings: { get: vi.fn().mockResolvedValue({}), set: vi.fn().mockResolvedValue({}) },
    tenants: { getAll: vi.fn().mockResolvedValue([]) },
    app: { getVersion: vi.fn().mockResolvedValue({ version: '0.0.0', platform: 'test' }) },
  },
  onChatsUpdated: vi.fn().mockReturnValue(vi.fn()),
  onNewMessage: vi.fn().mockReturnValue(vi.fn()),
  onTenantAuthState: vi.fn().mockReturnValue(vi.fn()),
  onDeviceCodeReady: vi.fn().mockReturnValue(vi.fn()),
  onSyncStatus: vi.fn().mockReturnValue(vi.fn()),
}));

describe('App theme integration', () => {
  beforeEach(() => {
    useAppStore.setState({
      tenants: [],
      chatsByTenant: {},
      syncingTenants: new Set(),
      errorTenants: {},
    });
  });

  it('applies the default midnight theme background to the container', () => {
    const { container } = render(<App />);
    const root = container.firstChild as HTMLElement;
    // jsdom converts hex to rgb
    expect(root.style.backgroundColor).toBe('rgb(18, 18, 32)');
  });

  it('applies the selected theme background when store changes', () => {
    useAppStore.setState({ settings: { ...useAppStore.getState().settings, theme: 'carbon' as const } });
    const { container } = render(<App />);
    const root = container.firstChild as HTMLElement;
    // jsdom converts hex to rgb
    expect(root.style.backgroundColor).toBe('rgb(14, 14, 14)');
  });
});
