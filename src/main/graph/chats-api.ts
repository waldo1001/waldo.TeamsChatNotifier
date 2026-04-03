import type { Client } from '@microsoft/microsoft-graph-client';
import type { GraphChat } from '../polling/poll-worker';

const EXPAND = 'lastMessagePreview,members';
const TOP = 50;

export class ChatsApi {
  constructor(private readonly client: Client) {}

  /**
   * Fetch all chats for the signed-in user, following pagination automatically.
   * Uses $expand=lastMessagePreview so we can detect changes without
   * fetching individual messages.
   */
  async listChats(): Promise<GraphChat[]> {
    const results: GraphChat[] = [];

    let response = await this.client
      .api('/me/chats')
      .expand(EXPAND)
      .orderby('lastMessagePreview/createdDateTime desc')
      .top(TOP)
      .get() as { value: GraphChat[]; '@odata.nextLink'?: string };

    results.push(...(response.value ?? []));

    // Follow pagination — only first 3 pages to avoid runaway requests
    let pageCount = 1;
    while (response['@odata.nextLink'] && pageCount < 3) {
      response = await this.client
        .api(response['@odata.nextLink'])
        .get() as { value: GraphChat[]; '@odata.nextLink'?: string };
      results.push(...(response.value ?? []));
      pageCount++;
    }

    return results;
  }

  /**
   * Mark all messages in a chat as read for the signed-in user.
   * Requires Chat.ReadWrite scope.
   */
  async markAsRead(chatId: string, userId: string, tenantId: string): Promise<void> {
    await this.client
      .api(`/chats/${chatId}/markChatReadForUser`)
      .post({ user: { id: userId, tenantId } });
  }
}
