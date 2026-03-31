import type Database from 'better-sqlite3';
import type { Message } from '../../../shared/types';

interface MessageRow {
  id: string;
  chat_id: string;
  tenant_id: string;
  sender_id: string | null;
  sender_display_name: string | null;
  body_content: string;
  created_at: string;
  is_system_message: number;
  notified: number;
}

function rowToMessage(row: MessageRow): Message {
  return {
    id: row.id,
    chatId: row.chat_id,
    tenantId: row.tenant_id,
    senderId: row.sender_id,
    senderDisplayName: row.sender_display_name,
    bodyContent: row.body_content,
    createdAt: row.created_at,
    isSystemMessage: row.is_system_message === 1,
    notified: row.notified === 1,
  };
}

export interface FindByChatOptions {
  excludeSystem?: boolean;
  limit?: number;
}

export class MessageRepository {
  constructor(private readonly db: Database.Database) {}

  upsert(message: Message): void {
    this.db
      .prepare(
        `INSERT INTO messages (
          id, chat_id, tenant_id, sender_id, sender_display_name,
          body_content, created_at, is_system_message, notified
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id, tenant_id) DO UPDATE SET
          body_content        = excluded.body_content,
          sender_display_name = excluded.sender_display_name,
          is_system_message   = excluded.is_system_message`,
      )
      .run(
        message.id,
        message.chatId,
        message.tenantId,
        message.senderId ?? null,
        message.senderDisplayName ?? null,
        message.bodyContent,
        message.createdAt,
        message.isSystemMessage ? 1 : 0,
        message.notified ? 1 : 0,
      );
  }

  findById(id: string, tenantId: string): Message | null {
    const row = this.db
      .prepare('SELECT * FROM messages WHERE id = ? AND tenant_id = ?')
      .get(id, tenantId) as MessageRow | undefined;
    return row ? rowToMessage(row) : null;
  }

  findByChat(
    chatId: string,
    tenantId: string,
    options: FindByChatOptions = {},
  ): Message[] {
    const { excludeSystem = false, limit = 50 } = options;
    const sql = excludeSystem
      ? `SELECT * FROM messages WHERE chat_id = ? AND tenant_id = ? AND is_system_message = 0
         ORDER BY created_at DESC LIMIT ?`
      : `SELECT * FROM messages WHERE chat_id = ? AND tenant_id = ?
         ORDER BY created_at DESC LIMIT ?`;
    const rows = this.db.prepare(sql).all(chatId, tenantId, limit) as MessageRow[];
    return rows.map(rowToMessage);
  }

  markNotified(id: string, tenantId: string): void {
    this.db
      .prepare('UPDATE messages SET notified = 1 WHERE id = ? AND tenant_id = ?')
      .run(id, tenantId);
  }

  isNotified(id: string, tenantId: string): boolean {
    const row = this.db
      .prepare('SELECT notified FROM messages WHERE id = ? AND tenant_id = ?')
      .get(id, tenantId) as { notified: number } | undefined;
    return row ? row.notified === 1 : false;
  }

  deleteOlderThan(isoTimestamp: string): void {
    this.db
      .prepare('DELETE FROM messages WHERE created_at < ?')
      .run(isoTimestamp);
  }
}
