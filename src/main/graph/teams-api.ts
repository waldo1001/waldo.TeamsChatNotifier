import type { Client } from '@microsoft/microsoft-graph-client';
import type { GraphChannelMessage } from '../polling/poll-worker';

export interface GraphTeam {
  id: string;
  displayName?: string;
}

export interface GraphChannel {
  id: string;
  displayName?: string;
  webUrl?: string;
  membershipType?: string;
}

export class TeamsApi {
  constructor(private readonly client: Client) {}

  /**
   * Fetch all teams the signed-in user is a member of, following pagination.
   */
  async listJoinedTeams(): Promise<GraphTeam[]> {
    const results: GraphTeam[] = [];

    let response = await this.client
      .api('/me/joinedTeams')
      .get() as { value: GraphTeam[]; '@odata.nextLink'?: string };

    results.push(...(response.value ?? []));

    let pageCount = 1;
    while (response['@odata.nextLink'] && pageCount < 3) {
      response = await this.client
        .api(response['@odata.nextLink'])
        .get() as { value: GraphTeam[]; '@odata.nextLink'?: string };
      results.push(...(response.value ?? []));
      pageCount++;
    }

    return results;
  }

  /**
   * Fetch all channels in a team.
   */
  async listChannels(teamId: string): Promise<GraphChannel[]> {
    const response = await this.client
      .api(`/teams/${teamId}/channels`)
      .get() as { value: GraphChannel[] };

    return response.value ?? [];
  }

  /**
   * Fetch channel messages (thread root messages) created after the given ISO timestamp.
   */
  async listChannelMessages(
    teamId: string,
    channelId: string,
    sinceIso: string,
  ): Promise<GraphChannelMessage[]> {
    const response = await this.client
      .api(`/teams/${teamId}/channels/${channelId}/messages`)
      .filter(`lastModifiedDateTime gt ${sinceIso}`)
      .orderby('createdDateTime desc')
      .top(25)
      .get() as { value: GraphChannelMessage[] };

    return response.value ?? [];
  }

  /**
   * Fetch replies to a specific channel message (thread replies) created after the given ISO timestamp.
   */
  async listMessageReplies(
    teamId: string,
    channelId: string,
    messageId: string,
    sinceIso: string,
  ): Promise<GraphChannelMessage[]> {
    const response = await this.client
      .api(`/teams/${teamId}/channels/${channelId}/messages/${messageId}/replies`)
      .filter(`lastModifiedDateTime gt ${sinceIso}`)
      .orderby('createdDateTime desc')
      .top(25)
      .get() as { value: GraphChannelMessage[] };

    return response.value ?? [];
  }
}
