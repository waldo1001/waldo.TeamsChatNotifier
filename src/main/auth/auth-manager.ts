import { PublicClientApplication } from '@azure/msal-node';
import type { AccountInfo } from '@azure/msal-node';
import type { DeviceCodeResponse } from '@azure/msal-common';
import { createCachePlugin, deleteCacheFile, persistCacheToFile } from './token-cache';

const SCOPES = [
  'Chat.ReadBasic', 'Chat.Read', 'User.Read', 'offline_access',
  'Team.ReadBasic.All', 'Channel.ReadBasic.All', 'ChannelMessage.Read.All',
];

// Critical: device code flow must NOT use /common — causes AADSTS90133.
// Use /organizations for initial auth (work/school accounts), then re-register
// with the specific tenantId extracted from the returned ID token.
const INITIAL_AUTHORITY = 'https://login.microsoftonline.com/organizations';

function tenantAuthority(tenantId: string): string {
  return `https://login.microsoftonline.com/${tenantId}`;
}

export interface DeviceCodeFlowResult {
  tenantId: string;
  accessToken: string;
}

export type DeviceCodeCallback = (response: DeviceCodeResponse) => void;

export class AuthManager {
  private pcaMap = new Map<string, PublicClientApplication>();

  constructor(private readonly clientId: string) {}

  /** Register a tenant and create its MSAL PCA. No-op if already registered. */
  registerTenant(tenantId: string): void {
    if (this.pcaMap.has(tenantId)) return;

    const pca = new PublicClientApplication({
      auth: {
        clientId: this.clientId,
        authority: tenantAuthority(tenantId),
      },
      cache: {
        cachePlugin: createCachePlugin(tenantId),
      },
    });

    this.pcaMap.set(tenantId, pca);
  }

  isRegistered(tenantId: string): boolean {
    return this.pcaMap.has(tenantId);
  }

  /**
   * Start a device code flow for a new tenant sign-in.
   * Calls `onDeviceCode` with the user code and verification URL.
   * Resolves with the tenantId and access token once sign-in completes.
   */
  async startDeviceCodeFlow(
    onDeviceCode: DeviceCodeCallback,
    _loginHint?: string,
  ): Promise<DeviceCodeFlowResult> {
    // Use initial /organizations authority — real tenantId comes from token
    const pca = new PublicClientApplication({
      auth: {
        clientId: this.clientId,
        authority: INITIAL_AUTHORITY,
      },
    });

    const result = await pca.acquireTokenByDeviceCode({
      scopes: SCOPES,
      deviceCodeCallback: onDeviceCode,
    });

    if (!result) throw new Error('Device code flow returned null result');

    const tenantId = result.account?.tenantId;
    if (!tenantId) throw new Error('Could not extract tenantId from token');

    // Persist the temp PCA's token cache to disk so the permanent PCA can read it
    const serializedCache = pca.getTokenCache().serialize();
    persistCacheToFile(tenantId, serializedCache);

    // Re-register with specific tenant authority and persistent cache
    this.pcaMap.delete(tenantId);
    this.registerTenant(tenantId);

    return { tenantId, accessToken: result.accessToken };
  }

  cancelDeviceCodeFlow(): void {
    // MSAL Node v2 device code cancel: set cancel flag on the request.
    // In practice, the most reliable approach is to just let it timeout
    // or track the request and abort via timeout. This is a no-op placeholder
    // since MSAL Node v2 cancels via a `cancel` flag set on the request object
    // (which we can't easily access here). The UI should close the modal.
  }

  /**
   * Get a valid access token for a tenant using silent flow.
   * MSAL handles token refresh automatically.
   */
  async getAccessTokenForTenant(tenantId: string): Promise<string> {
    const pca = this.pcaMap.get(tenantId);
    if (!pca) throw new Error(`Tenant ${tenantId} not registered in AuthManager`);

    const accounts = await pca.getAllAccounts();
    if (!accounts || accounts.length === 0) {
      throw new Error(`No account found for tenant ${tenantId} — re-authentication required`);
    }

    const result = await pca.acquireTokenSilent({
      scopes: SCOPES,
      account: accounts[0] as AccountInfo,
    });

    if (!result?.accessToken) {
      throw new Error(`Silent token acquisition failed for tenant ${tenantId}`);
    }

    return result.accessToken;
  }

  /**
   * Remove a tenant: sign out, delete cache file, remove PCA.
   */
  async unregisterTenant(tenantId: string): Promise<void> {
    const pca = this.pcaMap.get(tenantId);
    if (pca) {
      const accounts = await pca.getAllAccounts();
      for (const account of accounts) {
        await pca.signOut({ account: account as AccountInfo });
      }
      this.pcaMap.delete(tenantId);
    }
    deleteCacheFile(tenantId);
  }
}
