import type { ICachePlugin, TokenCacheContext } from '@azure/msal-node';
import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';

/**
 * MSAL ICachePlugin implementation that stores token caches as
 * OS-keychain-encrypted files (macOS Keychain / Windows DPAPI / Linux libsecret).
 * One file per tenant, stored in the app's userData directory.
 */
export function createCachePlugin(tenantId: string): ICachePlugin {
  const cacheDir = path.join(app.getPath('userData'), 'token-caches');
  const cacheFile = path.join(cacheDir, `${tenantId}.cache`);

  return {
    async beforeCacheAccess(ctx: TokenCacheContext): Promise<void> {
      if (!fs.existsSync(cacheFile)) return;
      try {
        const encrypted = fs.readFileSync(cacheFile);
        if (safeStorage.isEncryptionAvailable()) {
          const decrypted = safeStorage.decryptString(encrypted);
          ctx.tokenCache.deserialize(decrypted);
        }
      } catch {
        // Corrupted cache — start fresh
      }
    },

    async afterCacheAccess(ctx: TokenCacheContext): Promise<void> {
      if (!ctx.cacheHasChanged) return;
      try {
        const serialized = ctx.tokenCache.serialize();
        if (safeStorage.isEncryptionAvailable()) {
          const encrypted = safeStorage.encryptString(serialized);
          fs.mkdirSync(cacheDir, { recursive: true });
          fs.writeFileSync(cacheFile, encrypted);
        }
      } catch {
        // Best-effort — don't crash on cache write failure
      }
    },
  };
}

export function deleteCacheFile(tenantId: string): void {
  try {
    const cacheFile = path.join(
      app.getPath('userData'),
      'token-caches',
      `${tenantId}.cache`,
    );
    if (fs.existsSync(cacheFile)) {
      fs.unlinkSync(cacheFile);
    }
  } catch {
    // Best-effort
  }
}

/**
 * Persist a serialized MSAL token cache to the tenant's cache file.
 * Used to transfer tokens from a temporary PCA (device code flow) to
 * the persistent cache that the tenant's permanent PCA reads from.
 */
export function persistCacheToFile(tenantId: string, serializedCache: string): void {
  try {
    const cacheDir = path.join(app.getPath('userData'), 'token-caches');
    const cacheFile = path.join(cacheDir, `${tenantId}.cache`);
    if (safeStorage.isEncryptionAvailable()) {
      const encrypted = safeStorage.encryptString(serializedCache);
      fs.mkdirSync(cacheDir, { recursive: true });
      fs.writeFileSync(cacheFile, encrypted);
    }
  } catch {
    // Best-effort
  }
}
