import type { Client } from '@microsoft/microsoft-graph-client';
import type { GraphChatMessage } from '../polling/poll-worker';

export class MessagesApi {
  constructor(private readonly client: Client) {}

  /**
   * Fetch messages in a chat created after the given ISO timestamp.
   * Returns most-recent-first, capped at 20 messages per call.
   */
  async listMessages(
    chatId: string,
    sinceIso: string,
  ): Promise<GraphChatMessage[]> {
    const response = await this.client
      .api(`/chats/${chatId}/messages`)
      .filter(`lastModifiedDateTime gt ${sinceIso}`)
      .orderby('createdDateTime desc')
      .top(20)
      .get() as { value: GraphChatMessage[] };

    return response.value ?? [];
  }
}
