import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { applySchema } from '../../../../src/main/db/schema';
import { TenantRepository } from '../../../../src/main/db/repositories/tenant-repo';
import { TeamRepository } from '../../../../src/main/db/repositories/team-repo';
import type { Team, Tenant } from '../../../../src/shared/types';

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

function makeTeam(overrides: Partial<Team> = {}): Team {
  return {
    id: 'team-001',
    displayName: 'Engineering',
    tenantId: 'tenant-001',
    ...overrides,
  };
}

describe('TeamRepository', () => {
  let db: Database.Database;
  let repo: TeamRepository;
  let tenantRepo: TenantRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    applySchema(db);
    tenantRepo = new TenantRepository(db);
    tenantRepo.upsert(makeTenant());
    repo = new TeamRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('inserts and retrieves a team by ID and tenantId', () => {
    repo.upsert(makeTeam());
    const result = repo.findById('team-001', 'tenant-001');
    expect(result).toBeDefined();
    expect(result?.displayName).toBe('Engineering');
    expect(result?.tenantId).toBe('tenant-001');
  });

  it('returns null for unknown ID', () => {
    expect(repo.findById('nonexistent', 'tenant-001')).toBeNull();
  });

  it('upserts (updates existing team on conflict)', () => {
    repo.upsert(makeTeam());
    repo.upsert(makeTeam({ displayName: 'Engineering v2' }));
    const result = repo.findById('team-001', 'tenant-001');
    expect(result?.displayName).toBe('Engineering v2');
  });

  it('returns all teams for a tenant', () => {
    repo.upsert(makeTeam({ id: 'team-001' }));
    repo.upsert(makeTeam({ id: 'team-002', displayName: 'Marketing' }));
    const teams = repo.findByTenant('tenant-001');
    expect(teams).toHaveLength(2);
  });

  it('isolates teams across tenants', () => {
    tenantRepo.upsert(makeTenant({ id: 'tenant-002', userPrincipalName: 'bob@fabrikam.com' }));
    repo.upsert(makeTeam({ id: 'team-001', tenantId: 'tenant-001' }));
    repo.upsert(makeTeam({ id: 'team-001', tenantId: 'tenant-002', displayName: 'Other' }));
    expect(repo.findByTenant('tenant-001')).toHaveLength(1);
    expect(repo.findByTenant('tenant-002')).toHaveLength(1);
    expect(repo.findById('team-001', 'tenant-002')?.displayName).toBe('Other');
  });

  it('returns empty array when no teams exist for tenant', () => {
    expect(repo.findByTenant('tenant-001')).toEqual([]);
  });

  it('cascades delete when tenant is removed', () => {
    repo.upsert(makeTeam());
    tenantRepo.delete('tenant-001');
    expect(repo.findByTenant('tenant-001')).toEqual([]);
  });
});
