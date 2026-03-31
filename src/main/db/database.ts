import BetterSqlite3 from 'better-sqlite3';
import path from 'path';
import { applySchema } from './schema';

let _db: BetterSqlite3.Database | null = null;

export function getDatabase(dataPath?: string): BetterSqlite3.Database {
  if (_db) return _db;

  const dbPath = dataPath
    ? path.join(dataPath, 'teams-chat-notifier.db')
    : ':memory:';

  _db = new BetterSqlite3(dbPath);
  applySchema(_db);
  return _db;
}

export function closeDatabase(): void {
  if (_db) {
    _db.close();
    _db = null;
  }
}

/** Prune messages older than 7 days. Call once per app launch. */
export function pruneOldMessages(db: BetterSqlite3.Database): number {
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const result = db.prepare('DELETE FROM messages WHERE created_at < ?').run(cutoff);
  return result.changes;
}
