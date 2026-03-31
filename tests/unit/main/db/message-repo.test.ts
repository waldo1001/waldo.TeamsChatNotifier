import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { applySchema } from '../../../../src/main/db/schema';
import { TenantRepository } from '../../../../src/main/db/repositories/tenant-repo';
import { ChatRepository } from '../../../../src/main/db/repositories/chat-repo';
import { MessageRepository } from '../../../../src/main/db/repositories/message-repo';
import type { Message } from '../../../../src/shared/types';

function makeMessage(overrides: Partial<Message> = {}): Message {
  return {
    id: 'msg-001',
    chatId: '19:abc@thread.v2',
    tenantId: 'tenant-001',
    senderId: 'user-bob',
    senderDisplayName: 'Bob',
    bodyContent: 'Hello world',
    createdAt: '2024-01-01T10:00:00.000Z',
    isSystemMessage: false,
    notified: false,
    ...overrides,
  };
}

describe('MessageRepository', () => {
  let db: Database.Database;
  let repo: MessageRepository;

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
    const chatRepo = new ChatRepository(db);
    chatRepo.upsert({
      id: '19:abc@thread.v2',
      tenantId: 'tenant-001',
      chatType: 'oneOnOne',
      topic: null,
      memberNames: ['Alice', 'Bob'],
      lastMessagePreviewText: null,
      lastMessagePreviewSender: null,
      lastMessageAt: null,
      lastReadAt: null,
      isHidden: false,
      webUrl: null,
      lastPolledAt: null,
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
    repo = new MessageRepository(db);
  });

  afterEach(() => {
    db.close();
  });

  it('inserts and retrieves a message by ID', () => {
    repo.upsert(makeMessage());
    const result = repo.findById('msg-001', 'tenant-001');
    expect(result).toBeDefined();
    expect(result?.bodyContent).toBe('Hello world');
    expect(result?.notified).toBe(false);
  });

  it('upserts without error if message already exists', () => {
    repo.upsert(makeMessage());
    repo.upsert(makeMessage({ bodyContent: 'Updated' }));
    expect(repo.findById('msg-001', 'tenant-001')?.bodyContent).toBe('Updated');
  });

  it('marks a message as notified', () => {
    repo.upsert(makeMessage());
    repo.markNotified('msg-001', 'tenant-001');
    expect(repo.findById('msg-001', 'tenant-001')?.notified).toBe(true);
  });

  it('checks if message has already been notified', () => {
    repo.upsert(makeMessage({ notified: false }));
    expect(repo.isNotified('msg-001', 'tenant-001')).toBe(false);
    repo.markNotified('msg-001', 'tenant-001');
    expect(repo.isNotified('msg-001', 'tenant-001')).toBe(true);
  });

  it('returns false for isNotified on unknown message', () => {
    expect(repo.isNotified('nonexistent', 'tenant-001')).toBe(false);
  });

  it('returns messages for a chat ordered by createdAt desc', () => {
    repo.upsert(makeMessage({ id: 'msg-1', createdAt: '2024-01-01T08:00:00.000Z' }));
    repo.upsert(makeMessage({ id: 'msg-2', createdAt: '2024-01-01T12:00:00.000Z' }));
    repo.upsert(makeMessage({ id: 'msg-3', createdAt: '2024-01-01T06:00:00.000Z' }));
    const msgs = repo.findByChat('19:abc@thread.v2', 'tenant-001');
    expect(msgs.map(m => m.id)).toEqual(['msg-2', 'msg-1', 'msg-3']);
  });

  it('does not return system messages in non-system query', () => {
    repo.upsert(makeMessage({ id: 'user-msg', isSystemMessage: false }));
    repo.upsert(makeMessage({ id: 'sys-msg', isSystemMessage: true }));
    const msgs = repo.findByChat('19:abc@thread.v2', 'tenant-001', { excludeSystem: true });
    expect(msgs.map(m => m.id)).toEqual(['user-msg']);
  });

  it('deletes messages older than given date', () => {
    repo.upsert(makeMessage({ id: 'old', createdAt: '2023-01-01T00:00:00.000Z' }));
    repo.upsert(makeMessage({ id: 'new', createdAt: '2024-06-01T00:00:00.000Z' }));
    repo.deleteOlderThan('2024-01-01T00:00:00.000Z');
    expect(repo.findById('old', 'tenant-001')).toBeNull();
    expect(repo.findById('new', 'tenant-001')).toBeDefined();
  });
});
