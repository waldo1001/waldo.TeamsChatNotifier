import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { applySchema } from '../../../../src/main/db/schema';
import { TenantRepository } from '../../../../src/main/db/repositories/tenant-repo';
import type { Tenant } from '../../../../src/shared/types';

function makeTenant(overrides: Partial<Tenant> = {}): Tenant {
  return {
    id: 'tenant-001',
    displayName: 'Contoso Corp',
    userPrincipalName: 'alice@contoso.com',
    userId: 'user-obj-id-001',
    addedAt: '2024-01-01T00:00:00.000Z',
    lastSyncedAt: null,
    ...overrides,
  };
}

describe('TenantRepository', () => {
  let db: Database.Database;
  let repo: TenantRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    applySchema(db);
    repo = new TenantRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('inserts and retrieves a tenant by ID', () => {
    const tenant = makeTenant();
    repo.upsert(tenant);
    const result = repo.findById('tenant-001');
    expect(result).toBeDefined();
    expect(result?.displayName).toBe('Contoso Corp');
    expect(result?.userPrincipalName).toBe('alice@contoso.com');
  });

  it('returns null for unknown ID', () => {
    expect(repo.findById('nonexistent')).toBeNull();
  });

  it('upserts (updates existing tenant on conflict)', () => {
    repo.upsert(makeTenant());
    repo.upsert(makeTenant({ displayName: 'Contoso Updated' }));
    const result = repo.findById('tenant-001');
    expect(result?.displayName).toBe('Contoso Updated');
  });

  it('returns all tenants', () => {
    repo.upsert(makeTenant({ id: 'tenant-001' }));
    repo.upsert(makeTenant({ id: 'tenant-002', userPrincipalName: 'bob@fabrikam.com' }));
    expect(repo.findAll()).toHaveLength(2);
  });

  it('deletes a tenant by ID', () => {
    repo.upsert(makeTenant());
    repo.delete('tenant-001');
    expect(repo.findById('tenant-001')).toBeNull();
  });

  it('updates lastSyncedAt', () => {
    repo.upsert(makeTenant());
    const ts = '2024-06-01T12:00:00.000Z';
    repo.updateLastSynced('tenant-001', ts);
    expect(repo.findById('tenant-001')?.lastSyncedAt).toBe(ts);
  });

  it('returns empty array when no tenants exist', () => {
    expect(repo.findAll()).toEqual([]);
  });
});
