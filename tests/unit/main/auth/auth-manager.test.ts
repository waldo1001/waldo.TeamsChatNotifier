import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';

// ── Hoist mocks so they are available inside vi.mock factories ───────────────
const {
  mockAcquireTokenSilent,
  mockAcquireTokenByDeviceCode,
  mockGetAllAccounts,
  mockRemoveAccount,
  mockSignOut,
  mockGetTokenCache,
  MockPublicClientApplication,
} = vi.hoisted(() => {
  const mockAcquireTokenSilent = vi.fn();
  const mockAcquireTokenByDeviceCode = vi.fn();
  const mockGetAllAccounts = vi.fn().mockResolvedValue([]);
  const mockRemoveAccount = vi.fn();
  const mockSignOut = vi.fn().mockResolvedValue(undefined);
  const mockGetTokenCache = vi.fn().mockReturnValue({
    serialize: vi.fn().mockReturnValue('{}'),
    deserialize: vi.fn(),
  });
  const MockPublicClientApplication = vi.fn().mockImplementation(() => ({
    acquireTokenSilent: mockAcquireTokenSilent,
    acquireTokenByDeviceCode: mockAcquireTokenByDeviceCode,
    getAllAccounts: mockGetAllAccounts,
    removeAccount: mockRemoveAccount,
    signOut: mockSignOut,
    getTokenCache: mockGetTokenCache,
  }));
  return {
    mockAcquireTokenSilent,
    mockAcquireTokenByDeviceCode,
    mockGetAllAccounts,
    mockRemoveAccount,
    mockSignOut,
    mockGetTokenCache,
    MockPublicClientApplication,
  };
});

vi.mock('@azure/msal-node', () => ({
  PublicClientApplication: MockPublicClientApplication,
}));

// ── Mock token-cache so auth-manager tests don't need electron APIs ──────────
vi.mock('../../../../src/main/auth/token-cache', () => ({
  createCachePlugin: vi.fn().mockReturnValue({
    beforeCacheAccess: vi.fn(),
    afterCacheAccess: vi.fn(),
  }),
  deleteCacheFile: vi.fn(),
  persistCacheToFile: vi.fn(),
}));

import { AuthManager } from '../../../../src/main/auth/auth-manager';

describe('AuthManager', () => {
  let manager: AuthManager;

  beforeEach(() => {
    vi.clearAllMocks();
    MockPublicClientApplication.mockImplementation(() => ({
      acquireTokenSilent: mockAcquireTokenSilent,
      acquireTokenByDeviceCode: mockAcquireTokenByDeviceCode,
      getAllAccounts: mockGetAllAccounts,
      removeAccount: mockRemoveAccount,
      signOut: mockSignOut,
      getTokenCache: mockGetTokenCache,
    }));
    mockGetAllAccounts.mockResolvedValue([]);
    manager = new AuthManager('test-client-id');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('getAccessTokenForTenant', () => {
    it('returns access token via silent flow when account exists', async () => {
      const mockAccount = { tenantId: 'tenant-001', username: 'alice@contoso.com' };
      mockGetAllAccounts.mockResolvedValueOnce([mockAccount]);
      mockAcquireTokenSilent.mockResolvedValueOnce({ accessToken: 'token-abc' });

      // Pre-register a tenant
      manager.registerTenant('tenant-001');

      const token = await manager.getAccessTokenForTenant('tenant-001');
      expect(token).toBe('token-abc');
    });

    it('throws when no account exists for tenant', async () => {
      mockGetAllAccounts.mockReturnValue([]);
      manager.registerTenant('tenant-001');

      await expect(manager.getAccessTokenForTenant('tenant-001')).rejects.toThrow();
    });

    it('throws when tenant is not registered', async () => {
      await expect(manager.getAccessTokenForTenant('unknown-tenant')).rejects.toThrow(
        /not registered/i,
      );
    });

    it('throws when acquireTokenSilent fails', async () => {
      const mockAccount = { tenantId: 'tenant-001', username: 'alice@contoso.com' };
      mockGetAllAccounts.mockResolvedValueOnce([mockAccount]);
      mockAcquireTokenSilent.mockRejectedValueOnce(new Error('token expired'));

      manager.registerTenant('tenant-001');
      await expect(manager.getAccessTokenForTenant('tenant-001')).rejects.toThrow('token expired');
    });
  });

  describe('registerTenant', () => {
    it('creates a PCA instance for the tenant', () => {
      manager.registerTenant('tenant-abc');
      expect(MockPublicClientApplication).toHaveBeenCalled();
    });

    it('does not create duplicate PCA instances for the same tenant', () => {
      const callsBefore = MockPublicClientApplication.mock.calls.length;
      manager.registerTenant('tenant-abc');
      manager.registerTenant('tenant-abc'); // second call should be no-op
      expect(MockPublicClientApplication.mock.calls.length).toBe(callsBefore + 1);
    });
  });

  describe('isRegistered', () => {
    it('returns false for unknown tenant', () => {
      expect(manager.isRegistered('tenant-xyz')).toBe(false);
    });

    it('returns true after registering a tenant', () => {
      manager.registerTenant('tenant-xyz');
      expect(manager.isRegistered('tenant-xyz')).toBe(true);
    });
  });

  describe('unregisterTenant', () => {
    it('removes the tenant so isRegistered returns false', async () => {
      manager.registerTenant('tenant-001');
      await manager.unregisterTenant('tenant-001');
      expect(manager.isRegistered('tenant-001')).toBe(false);
    });

    it('calls signOut on the MSAL PCA', async () => {
      const mockAccount = { tenantId: 'tenant-001', username: 'alice@contoso.com' };
      mockGetAllAccounts.mockResolvedValueOnce([mockAccount]);
      manager.registerTenant('tenant-001');
      await manager.unregisterTenant('tenant-001');
      expect(mockSignOut).toHaveBeenCalledWith({ account: mockAccount });
    });
  });
});
