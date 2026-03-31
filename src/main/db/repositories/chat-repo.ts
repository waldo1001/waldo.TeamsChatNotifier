import type Database from 'better-sqlite3';
import type { Chat, ChatType } from '../../../shared/types';

interface ChatRow {
  id: string;
  tenant_id: string;
  chat_type: string;
  topic: string | null;
  member_names_json: string;
  last_message_preview_text: string | null;
  last_message_preview_sender: string | null;
  last_message_at: string | null;
  last_read_at: string | null;
  web_url: string | null;
  is_hidden: number;
  last_polled_at: string | null;
  updated_at: string;
}

function rowToChat(row: ChatRow): Chat {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    chatType: row.chat_type as ChatType,
    topic: row.topic,
    memberNames: JSON.parse(row.member_names_json) as string[],
    lastMessagePreviewText: row.last_message_preview_text,
    lastMessagePreviewSender: row.last_message_preview_sender,
    lastMessageAt: row.last_message_at,
    lastReadAt: row.last_read_at,
    isHidden: row.is_hidden === 1,
    webUrl: row.web_url,
    lastPolledAt: row.last_polled_at,
    updatedAt: row.updated_at,
  };
}

export interface FindByTenantOptions {
  includeHidden?: boolean;
}

export class ChatRepository {
  constructor(private readonly db: Database.Database) {}

  upsert(chat: Chat): void {
    this.db
      .prepare(
        `INSERT INTO chats (
          id, tenant_id, chat_type, topic, member_names_json,
          last_message_preview_text, last_message_preview_sender,
          last_message_at, last_read_at, web_url,
          is_hidden, last_polled_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id, tenant_id) DO UPDATE SET
          chat_type                   = excluded.chat_type,
          topic                       = excluded.topic,
          member_names_json           = excluded.member_names_json,
          last_message_preview_text   = excluded.last_message_preview_text,
          last_message_preview_sender = excluded.last_message_preview_sender,
          last_message_at             = excluded.last_message_at,
          last_read_at                = excluded.last_read_at,
          web_url                     = excluded.web_url,
          is_hidden                   = excluded.is_hidden,
          updated_at                  = excluded.updated_at`,
      )
      .run(
        chat.id,
        chat.tenantId,
        chat.chatType,
        chat.topic ?? null,
        JSON.stringify(chat.memberNames),
        chat.lastMessagePreviewText ?? null,
        chat.lastMessagePreviewSender ?? null,
        chat.lastMessageAt ?? null,
        chat.lastReadAt ?? null,
        chat.webUrl ?? null,
        chat.isHidden ? 1 : 0,
        chat.lastPolledAt ?? null,
        chat.updatedAt,
      );
  }

  findById(id: string, tenantId: string): Chat | null {
    const row = this.db
      .prepare('SELECT * FROM chats WHERE id = ? AND tenant_id = ?')
      .get(id, tenantId) as ChatRow | undefined;
    return row ? rowToChat(row) : null;
  }

  findByTenant(tenantId: string, options: FindByTenantOptions = {}): Chat[] {
    const { includeHidden = false } = options;
    const sql = includeHidden
      ? 'SELECT * FROM chats WHERE tenant_id = ? ORDER BY last_message_at DESC'
      : 'SELECT * FROM chats WHERE tenant_id = ? AND is_hidden = 0 ORDER BY last_message_at DESC';
    const rows = this.db.prepare(sql).all(tenantId) as ChatRow[];
    return rows.map(rowToChat);
  }

  updateLastPolled(id: string, tenantId: string, timestamp: string): void {
    this.db
      .prepare('UPDATE chats SET last_polled_at = ? WHERE id = ? AND tenant_id = ?')
      .run(timestamp, id, tenantId);
  }

  markRead(id: string, tenantId: string, timestamp: string): void {
    this.db
      .prepare('UPDATE chats SET last_read_at = ? WHERE id = ? AND tenant_id = ?')
      .run(timestamp, id, tenantId);
  }
}
