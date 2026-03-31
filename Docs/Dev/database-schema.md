# Database Schema

Teams Chat Notifier uses **SQLite** via `better-sqlite3` with WAL mode and foreign keys enabled. The database file is stored at `{userData}/teams-chat-notifier.db`.

## Tables

### `tenants`

Stores registered Microsoft 365 tenant accounts.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PRIMARY KEY | Azure AD tenant ID |
| `display_name` | TEXT | NOT NULL | User's display name from Graph `/me` |
| `user_principal_name` | TEXT | NOT NULL | UPN (e.g. `user@contoso.com`) |
| `user_id` | TEXT | NOT NULL | Azure AD user object ID |
| `added_at` | TEXT | NOT NULL | ISO 8601 timestamp when tenant was added |
| `last_synced_at` | TEXT | nullable | ISO 8601 timestamp of last successful sync |

### `chats`

Stores Teams chat metadata. Composite primary key (`id`, `tenant_id`) supports the same chat ID across different tenants.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PK (composite) | Graph chat ID |
| `tenant_id` | TEXT | PK (composite), FK → tenants(id) ON DELETE CASCADE | Tenant this chat belongs to |
| `chat_type` | TEXT | NOT NULL | `oneOnOne`, `group`, `meeting`, or `unknownFutureValue` |
| `topic` | TEXT | nullable | Chat topic (group/meeting chats) |
| `member_names_json` | TEXT | NOT NULL, default `'[]'` | JSON array of member display names |
| `last_message_preview_text` | TEXT | nullable | Plain-text preview of the last message |
| `last_message_preview_sender` | TEXT | nullable | Display name of last message sender |
| `last_message_at` | TEXT | nullable | ISO 8601 timestamp of last message |
| `last_read_at` | TEXT | nullable | ISO 8601 timestamp of last read (from Graph viewpoint) |
| `web_url` | TEXT | nullable | Teams web URL for this chat |
| `is_hidden` | INTEGER | NOT NULL, default 0 | 1 if chat is hidden in Teams |
| `last_polled_at` | TEXT | nullable | ISO 8601 timestamp of last poll for this chat |
| `updated_at` | TEXT | NOT NULL | ISO 8601 timestamp of last local update |

**Indexes:**
- `idx_chats_tenant` — `(tenant_id)`
- `idx_chats_last_message` — `(tenant_id, last_message_at DESC)`

### `messages`

Stores individual chat messages. Composite primary key (`id`, `tenant_id`).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | TEXT | PK (composite) | Graph message ID |
| `chat_id` | TEXT | NOT NULL | Parent chat ID |
| `tenant_id` | TEXT | PK (composite), FK → tenants(id) ON DELETE CASCADE | Tenant this message belongs to |
| `sender_id` | TEXT | nullable | Azure AD user ID of the sender |
| `sender_display_name` | TEXT | nullable | Sender's display name |
| `body_content` | TEXT | NOT NULL | Plain-text message body (HTML stripped) |
| `created_at` | TEXT | NOT NULL | ISO 8601 creation timestamp |
| `is_system_message` | INTEGER | NOT NULL, default 0 | 1 for system/event messages |
| `notified` | INTEGER | NOT NULL, default 0 | 1 if a notification was shown for this message |

**Indexes:**
- `idx_messages_chat` — `(chat_id, tenant_id, created_at DESC)`

### `schema_migrations`

Tracks applied schema versions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `version` | INTEGER | PRIMARY KEY | Migration version number |
| `applied_at` | TEXT | NOT NULL | ISO 8601 timestamp when migration was applied |

Current version: **1** (initial schema).

## Maintenance

- **Pruning**: On app startup, messages older than 7 days are deleted via `pruneOldMessages()`.
- **Cascade deletes**: Removing a tenant cascades to delete all its chats and messages.

## Repository Layer

Three repository classes provide typed access to the database:

### `TenantRepository`

| Method | Description |
|--------|-------------|
| `upsert(tenant)` | Insert or update a tenant |
| `findById(id)` | Find a tenant by ID |
| `findAll()` | Return all tenants ordered by `added_at` |
| `delete(id)` | Delete a tenant (cascades to chats/messages) |
| `updateLastSynced(id, timestamp)` | Update `last_synced_at` |

### `ChatRepository`

| Method | Description |
|--------|-------------|
| `upsert(chat)` | Insert or update a chat |
| `findById(id, tenantId)` | Find a chat by composite key |
| `findByTenant(tenantId, options?)` | List chats for a tenant; `includeHidden` option |
| `updateLastPolled(id, tenantId, timestamp)` | Update poll timestamp |
| `markRead(id, tenantId, timestamp)` | Update `last_read_at` |

### `MessageRepository`

| Method | Description |
|--------|-------------|
| `upsert(message)` | Insert or update a message |
| `findById(id, tenantId)` | Find a message by composite key |
| `findByChat(chatId, tenantId, options?)` | List messages for a chat; supports `excludeSystem` and `limit` |
| `markNotified(id, tenantId)` | Set `notified = 1` |
| `isNotified(id, tenantId)` | Check if message was already notified |
| `deleteOlderThan(isoTimestamp)` | Bulk delete old messages |
