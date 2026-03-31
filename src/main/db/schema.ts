import type Database from 'better-sqlite3';

export function applySchema(db: Database.Database): void {
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  db.exec(`
    CREATE TABLE IF NOT EXISTS tenants (
      id                  TEXT PRIMARY KEY,
      display_name        TEXT NOT NULL,
      user_principal_name TEXT NOT NULL,
      user_id             TEXT NOT NULL,
      added_at            TEXT NOT NULL,
      last_synced_at      TEXT
    );

    CREATE TABLE IF NOT EXISTS chats (
      id                          TEXT NOT NULL,
      tenant_id                   TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      chat_type                   TEXT NOT NULL,
      topic                       TEXT,
      member_names_json           TEXT NOT NULL DEFAULT '[]',
      last_message_preview_text   TEXT,
      last_message_preview_sender TEXT,
      last_message_at             TEXT,
      last_read_at                TEXT,
      web_url                     TEXT,
      is_hidden                   INTEGER NOT NULL DEFAULT 0,
      last_polled_at              TEXT,
      updated_at                  TEXT NOT NULL,
      PRIMARY KEY (id, tenant_id)
    );

    CREATE INDEX IF NOT EXISTS idx_chats_tenant
      ON chats(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_chats_last_message
      ON chats(tenant_id, last_message_at DESC);

    CREATE TABLE IF NOT EXISTS teams (
      id            TEXT NOT NULL,
      tenant_id     TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      display_name  TEXT NOT NULL,
      PRIMARY KEY (id, tenant_id)
    );

    CREATE INDEX IF NOT EXISTS idx_teams_tenant
      ON teams(tenant_id);

    CREATE TABLE IF NOT EXISTS channels (
      id              TEXT NOT NULL,
      team_id         TEXT NOT NULL,
      tenant_id       TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      display_name    TEXT NOT NULL,
      web_url         TEXT,
      membership_type TEXT NOT NULL DEFAULT 'standard',
      last_polled_at  TEXT,
      PRIMARY KEY (id, team_id, tenant_id)
    );

    CREATE INDEX IF NOT EXISTS idx_channels_team
      ON channels(team_id, tenant_id);
    CREATE INDEX IF NOT EXISTS idx_channels_tenant
      ON channels(tenant_id);

    CREATE TABLE IF NOT EXISTS messages (
      id                  TEXT NOT NULL,
      chat_id             TEXT NOT NULL,
      tenant_id           TEXT NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      sender_id           TEXT,
      sender_display_name TEXT,
      body_content        TEXT NOT NULL,
      created_at          TEXT NOT NULL,
      is_system_message   INTEGER NOT NULL DEFAULT 0,
      notified            INTEGER NOT NULL DEFAULT 0,
      channel_id          TEXT,
      team_id             TEXT,
      parent_message_id   TEXT,
      PRIMARY KEY (id, tenant_id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_chat
      ON messages(chat_id, tenant_id, created_at DESC);

    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  // Record initial migration
  const exists = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 1')
    .get();
  if (!exists) {
    db.prepare(
      "INSERT INTO schema_migrations (version, applied_at) VALUES (1, ?)",
    ).run(new Date().toISOString());
  }

  // ── Migration 2: teams, channels, and channel fields on messages ────────
  const v2 = db
    .prepare('SELECT 1 FROM schema_migrations WHERE version = 2')
    .get();
  if (!v2) {
    // Add columns to messages if they don't exist yet (safe for fresh DBs too)
    const cols = db.pragma('table_info(messages)') as Array<{ name: string }>;
    const colNames = new Set(cols.map(c => c.name));
    if (!colNames.has('channel_id')) {
      db.exec('ALTER TABLE messages ADD COLUMN channel_id TEXT');
    }
    if (!colNames.has('team_id')) {
      db.exec('ALTER TABLE messages ADD COLUMN team_id TEXT');
    }
    if (!colNames.has('parent_message_id')) {
      db.exec('ALTER TABLE messages ADD COLUMN parent_message_id TEXT');
    }

    // Index for channel message lookups
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_messages_channel
        ON messages(channel_id, tenant_id, created_at DESC);
    `);

    db.prepare(
      "INSERT INTO schema_migrations (version, applied_at) VALUES (2, ?)",
    ).run(new Date().toISOString());
  }
}
