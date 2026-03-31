import type Database from 'better-sqlite3';
import type { Team } from '../../../shared/types';

interface TeamRow {
  id: string;
  tenant_id: string;
  display_name: string;
}

function rowToTeam(row: TeamRow): Team {
  return {
    id: row.id,
    tenantId: row.tenant_id,
    displayName: row.display_name,
  };
}

export class TeamRepository {
  constructor(private readonly db: Database.Database) {}

  upsert(team: Team): void {
    this.db
      .prepare(
        `INSERT INTO teams (id, tenant_id, display_name)
         VALUES (?, ?, ?)
         ON CONFLICT(id, tenant_id) DO UPDATE SET
           display_name = excluded.display_name`,
      )
      .run(team.id, team.tenantId, team.displayName);
  }

  findById(id: string, tenantId: string): Team | null {
    const row = this.db
      .prepare('SELECT * FROM teams WHERE id = ? AND tenant_id = ?')
      .get(id, tenantId) as TeamRow | undefined;
    return row ? rowToTeam(row) : null;
  }

  findByTenant(tenantId: string): Team[] {
    const rows = this.db
      .prepare('SELECT * FROM teams WHERE tenant_id = ? ORDER BY display_name')
      .all(tenantId) as TeamRow[];
    return rows.map(rowToTeam);
  }
}
