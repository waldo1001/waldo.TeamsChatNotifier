import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { applySchema } from '../../../../src/main/db/schema';
import { TenantRepository } from '../../../../src/main/db/repositories/tenant-repo';
import { TeamRepository } from '../../../../src/main/db/repositories/team-repo';
import { ChannelRepository } from '../../../../src/main/db/repositories/channel-repo';
import type { Channel, Team, Tenant } from '../../../../src/shared/types';

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

function makeChannel(overrides: Partial<Channel> = {}): Channel {
  return {
    id: 'ch-001',
    teamId: 'team-001',
    tenantId: 'tenant-001',
    displayName: 'General',
    webUrl: 'https://teams.microsoft.com/l/channel/ch-001',
    membershipType: 'standard',
    lastPolledAt: null,
    ...overrides,
  };
}

describe('ChannelRepository', () => {
  let db: Database.Database;
  let repo: ChannelRepository;
  let tenantRepo: TenantRepository;
  let teamRepo: TeamRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    applySchema(db);
    tenantRepo = new TenantRepository(db);
    tenantRepo.upsert(makeTenant());
    teamRepo = new TeamRepository(db);
    teamRepo.upsert(makeTeam());
    repo = new ChannelRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('inserts and retrieves a channel by ID, teamId, and tenantId', () => {
    repo.upsert(makeChannel());
    const result = repo.findById('ch-001', 'team-001', 'tenant-001');
    expect(result).toBeDefined();
    expect(result?.displayName).toBe('General');
    expect(result?.teamId).toBe('team-001');
    expect(result?.tenantId).toBe('tenant-001');
    expect(result?.membershipType).toBe('standard');
  });

  it('returns null for unknown channel', () => {
    expect(repo.findById('nonexistent', 'team-001', 'tenant-001')).toBeNull();
  });

  it('upserts (updates existing channel on conflict)', () => {
    repo.upsert(makeChannel());
    repo.upsert(makeChannel({ displayName: 'General (renamed)' }));
    const result = repo.findById('ch-001', 'team-001', 'tenant-001');
    expect(result?.displayName).toBe('General (renamed)');
  });

  it('returns all channels for a team', () => {
    repo.upsert(makeChannel({ id: 'ch-001' }));
    repo.upsert(makeChannel({ id: 'ch-002', displayName: 'Random' }));
    const channels = repo.findByTeam('team-001', 'tenant-001');
    expect(channels).toHaveLength(2);
  });

  it('returns all channels for a tenant across teams', () => {
    teamRepo.upsert(makeTeam({ id: 'team-002', displayName: 'Marketing' }));
    repo.upsert(makeChannel({ id: 'ch-001', teamId: 'team-001' }));
    repo.upsert(makeChannel({ id: 'ch-002', teamId: 'team-002' }));
    const channels = repo.findByTenant('tenant-001');
    expect(channels).toHaveLength(2);
  });

  it('returns empty array when no channels exist', () => {
    expect(repo.findByTeam('team-001', 'tenant-001')).toEqual([]);
  });

  it('updates lastPolledAt', () => {
    repo.upsert(makeChannel());
    const ts = '2024-06-01T12:00:00.000Z';
    repo.updateLastPolled('ch-001', 'team-001', 'tenant-001', ts);
    const result = repo.findById('ch-001', 'team-001', 'tenant-001');
    expect(result?.lastPolledAt).toBe(ts);
  });

  it('cascades delete when tenant is removed', () => {
    repo.upsert(makeChannel());
    tenantRepo.delete('tenant-001');
    expect(repo.findByTenant('tenant-001')).toEqual([]);
  });
});
