import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { applySchema } from '../../../../src/main/db/schema';
import { TenantRepository } from '../../../../src/main/db/repositories/tenant-repo';
import { ChatRepository } from '../../../../src/main/db/repositories/chat-repo';
import type { Chat } from '../../../../src/shared/types';

function makeChat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: '19:abc@thread.v2',
    tenantId: 'tenant-001',
    chatType: 'oneOnOne',
    topic: null,
    memberNames: ['Alice', 'Bob'],
    lastMessagePreviewText: 'Hey there',
    lastMessagePreviewSender: 'Alice',
    lastMessageAt: '2024-01-01T10:00:00.000Z',
    lastReadAt: '2024-01-01T09:00:00.000Z',
    isHidden: false,
    webUrl: 'https://teams.microsoft.com/l/chat/19%3Aabc/0?tenantId=tenant-001',
    lastPolledAt: null,
    updatedAt: '2024-01-01T10:00:00.000Z',
    ...overrides,
  };
}

describe('ChatRepository', () => {
  let db: Database.Database;
  let repo: ChatRepository;

  beforeEach(() => {
    db = new Database(':memory:');
    applySchema(db);
    const tenantRepo = new TenantRepository(db);
    tenantRepo.upsert({
      id: 'tenant-001',
      displayName: 'Contoso',
      userPrincipalName: 'alice@contoso.com',
      userId: 'user-001',
      addedAt: '2024-01-01T00:00:00.000Z',
      lastSyncedAt: null,
    });
    tenantRepo.upsert({
      id: 'tenant-002',
      displayName: 'Fabrikam',
      userPrincipalName: 'bob@fabrikam.com',
      userId: 'user-002',
      addedAt: '2024-01-01T00:00:00.000Z',
      lastSyncedAt: null,
    });
    repo = new ChatRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('upserts and retrieves a chat', () => {
    repo.upsert(makeChat());
    const result = repo.findById('19:abc@thread.v2', 'tenant-001');
    expect(result).toBeDefined();
    expect(result?.memberNames).toEqual(['Alice', 'Bob']);
  });

  it('returns null for unknown chat', () => {
    expect(repo.findById('nonexistent', 'tenant-001')).toBeNull();
  });

  it('composite primary key isolates same chatId across tenants', () => {
    // Same chat ID in two different tenants should be two separate rows
    repo.upsert(makeChat({ tenantId: 'tenant-001', lastMessagePreviewText: 'T1' }));
    repo.upsert(makeChat({ tenantId: 'tenant-002', lastMessagePreviewText: 'T2' }));
    expect(repo.findById('19:abc@thread.v2', 'tenant-001')?.lastMessagePreviewText).toBe('T1');
    expect(repo.findById('19:abc@thread.v2', 'tenant-002')?.lastMessagePreviewText).toBe('T2');
  });

  it('upserts updates existing row', () => {
    repo.upsert(makeChat({ lastMessagePreviewText: 'original' }));
    repo.upsert(makeChat({ lastMessagePreviewText: 'updated' }));
    expect(repo.findById('19:abc@thread.v2', 'tenant-001')?.lastMessagePreviewText).toBe('updated');
  });

  it('returns chats for a tenant ordered by lastMessageAt desc', () => {
    repo.upsert(makeChat({ id: 'chat-1', lastMessageAt: '2024-01-01T08:00:00.000Z' }));
    repo.upsert(makeChat({ id: 'chat-2', lastMessageAt: '2024-01-01T12:00:00.000Z' }));
    repo.upsert(makeChat({ id: 'chat-3', lastMessageAt: '2024-01-01T06:00:00.000Z' }));
    const chats = repo.findByTenant('tenant-001');
    expect(chats.map(c => c.id)).toEqual(['chat-2', 'chat-1', 'chat-3']);
  });

  it('excludes hidden chats by default', () => {
    repo.upsert(makeChat({ id: 'visible', isHidden: false }));
    repo.upsert(makeChat({ id: 'hidden', isHidden: true }));
    const chats = repo.findByTenant('tenant-001', { includeHidden: false });
    expect(chats.every(c => !c.isHidden)).toBe(true);
    expect(chats).toHaveLength(1);
  });

  it('includes hidden chats when requested', () => {
    repo.upsert(makeChat({ id: 'visible', isHidden: false }));
    repo.upsert(makeChat({ id: 'hidden', isHidden: true }));
    const chats = repo.findByTenant('tenant-001', { includeHidden: true });
    expect(chats).toHaveLength(2);
  });

  it('updates lastPolledAt', () => {
    repo.upsert(makeChat());
    const ts = '2024-06-01T12:00:00.000Z';
    repo.updateLastPolled('19:abc@thread.v2', 'tenant-001', ts);
    expect(repo.findById('19:abc@thread.v2', 'tenant-001')?.lastPolledAt).toBe(ts);
  });

  it('deletes all chats for a tenant via cascade when tenant is deleted', () => {
    const tenantRepo = new TenantRepository(db);
    repo.upsert(makeChat());
    tenantRepo.delete('tenant-001');
    expect(repo.findByTenant('tenant-001')).toHaveLength(0);
  });

  it('marks a chat as read by updating lastReadAt', () => {
    repo.upsert(makeChat({ lastReadAt: null }));
    const ts = '2024-06-01T12:00:00.000Z';
    repo.markRead('19:abc@thread.v2', 'tenant-001', ts);
    const chat = repo.findById('19:abc@thread.v2', 'tenant-001');
    expect(chat?.lastReadAt).toBe(ts);
  });

  it('markRead does not affect other fields', () => {
    repo.upsert(makeChat({ lastMessagePreviewText: 'Hello' }));
    repo.markRead('19:abc@thread.v2', 'tenant-001', '2024-06-01T12:00:00.000Z');
    const chat = repo.findById('19:abc@thread.v2', 'tenant-001');
    expect(chat?.lastMessagePreviewText).toBe('Hello');
    expect(chat?.memberNames).toEqual(['Alice', 'Bob']);
  });
});
