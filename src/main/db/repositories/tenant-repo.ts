import type Database from 'better-sqlite3';
import type { Tenant } from '../../../shared/types';

interface TenantRow {
  id: string;
  display_name: string;
  user_principal_name: string;
  user_id: string;
  added_at: string;
  last_synced_at: string | null;
}

function rowToTenant(row: TenantRow): Tenant {
  return {
    id: row.id,
    displayName: row.display_name,
    userPrincipalName: row.user_principal_name,
    userId: row.user_id,
    addedAt: row.added_at,
    lastSyncedAt: row.last_synced_at,
  };
}

export class TenantRepository {
  constructor(private readonly db: Database.Database) {}

  upsert(tenant: Tenant): void {
    this.db
      .prepare(
        `INSERT INTO tenants (id, display_name, user_principal_name, user_id, added_at, last_synced_at)
         VALUES (?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           display_name        = excluded.display_name,
           user_principal_name = excluded.user_principal_name,
           user_id             = excluded.user_id,
           last_synced_at      = excluded.last_synced_at`,
      )
      .run(
        tenant.id,
        tenant.displayName,
        tenant.userPrincipalName,
        tenant.userId,
        tenant.addedAt,
        tenant.lastSyncedAt ?? null,
      );
  }

  findById(id: string): Tenant | null {
    const row = this.db
      .prepare('SELECT * FROM tenants WHERE id = ?')
      .get(id) as TenantRow | undefined;
    return row ? rowToTenant(row) : null;
  }

  findAll(): Tenant[] {
    const rows = this.db
      .prepare('SELECT * FROM tenants ORDER BY added_at ASC')
      .all() as TenantRow[];
    return rows.map(rowToTenant);
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM tenants WHERE id = ?').run(id);
  }

  updateLastSynced(id: string, timestamp: string): void {
    this.db
      .prepare('UPDATE tenants SET last_synced_at = ? WHERE id = ?')
      .run(timestamp, id);
  }
}
