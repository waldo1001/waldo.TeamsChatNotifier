import type Database from 'better-sqlite3';
import type { Channel } from '../../../shared/types';

interface ChannelRow {
  id: string;
  team_id: string;
  tenant_id: string;
  display_name: string;
  web_url: string | null;
  membership_type: string;
  last_polled_at: string | null;
}

function rowToChannel(row: ChannelRow): Channel {
  return {
    id: row.id,
    teamId: row.team_id,
    tenantId: row.tenant_id,
    displayName: row.display_name,
    webUrl: row.web_url,
    membershipType: row.membership_type,
    lastPolledAt: row.last_polled_at,
  };
}

export class ChannelRepository {
  constructor(private readonly db: Database.Database) {}

  upsert(channel: Channel): void {
    this.db
      .prepare(
        `INSERT INTO channels (id, team_id, tenant_id, display_name, web_url, membership_type, last_polled_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id, team_id, tenant_id) DO UPDATE SET
           display_name    = excluded.display_name,
           web_url         = excluded.web_url,
           membership_type = excluded.membership_type`,
      )
      .run(
        channel.id,
        channel.teamId,
        channel.tenantId,
        channel.displayName,
        channel.webUrl ?? null,
        channel.membershipType,
        channel.lastPolledAt ?? null,
      );
  }

  findById(id: string, teamId: string, tenantId: string): Channel | null {
    const row = this.db
      .prepare('SELECT * FROM channels WHERE id = ? AND team_id = ? AND tenant_id = ?')
      .get(id, teamId, tenantId) as ChannelRow | undefined;
    return row ? rowToChannel(row) : null;
  }

  findByTeam(teamId: string, tenantId: string): Channel[] {
    const rows = this.db
      .prepare('SELECT * FROM channels WHERE team_id = ? AND tenant_id = ? ORDER BY display_name')
      .all(teamId, tenantId) as ChannelRow[];
    return rows.map(rowToChannel);
  }

  findByTenant(tenantId: string): Channel[] {
    const rows = this.db
      .prepare('SELECT * FROM channels WHERE tenant_id = ? ORDER BY display_name')
      .all(tenantId) as ChannelRow[];
    return rows.map(rowToChannel);
  }

  updateLastPolled(id: string, teamId: string, tenantId: string, timestamp: string): void {
    this.db
      .prepare('UPDATE channels SET last_polled_at = ? WHERE id = ? AND team_id = ? AND tenant_id = ?')
      .run(timestamp, id, teamId, tenantId);
  }
}
