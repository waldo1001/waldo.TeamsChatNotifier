import { describe, it, expect } from 'vitest';
import { chatDeepLink, messageDeepLink, channelMessageDeepLink, stripHtml, truncate, teamsAppLink, sortChatsUnreadFirst } from '../../../src/shared/deep-links';

describe('chatDeepLink', () => {
  it('builds a valid Teams chat deep link', () => {
    const url = chatDeepLink('19:abc123@thread.v2', 'tenant-guid-123');
    expect(url).toBe(
      'https://teams.microsoft.com/l/chat/19%3Aabc123%40thread.v2/0?tenantId=tenant-guid-123',
    );
  });

  it('URL-encodes the chat ID', () => {
    const url = chatDeepLink('19:a b+c@thread.v2', 'tenant-1');
    expect(url).toContain('19%3Aa%20b%2Bc%40thread.v2');
  });

  it('throws when chatId is empty', () => {
    expect(() => chatDeepLink('', 'tenant-1')).toThrow('chatId is required');
  });

  it('throws when tenantId is empty', () => {
    expect(() => chatDeepLink('19:abc@thread.v2', '')).toThrow('tenantId is required');
  });
});

describe('messageDeepLink', () => {
  it('builds a valid Teams message deep link', () => {
    const url = messageDeepLink('19:abc@thread.v2', '1616964509832', 'tenant-guid');
    expect(url).toContain('https://teams.microsoft.com/l/message/');
    expect(url).toContain('1616964509832');
    expect(url).toContain('tenantId=tenant-guid');
  });

  it('throws when messageId is empty', () => {
    expect(() => messageDeepLink('19:abc@thread.v2', '', 'tenant-1')).toThrow(
      'messageId is required',
    );
  });
});

describe('channelMessageDeepLink', () => {
  it('builds a valid Teams channel message deep link', () => {
    const url = channelMessageDeepLink('19:channel@thread.tacv2', '1616964509832', 'tenant-guid', 'team-guid');
    expect(url).toContain('https://teams.microsoft.com/l/message/');
    expect(url).toContain('1616964509832');
    expect(url).toContain('groupId=team-guid');
    expect(url).toContain('tenantId=tenant-guid');
    expect(url).toContain('contextType');
    expect(url).not.toContain('parentMessageId');
  });

  it('includes parentMessageId for replies', () => {
    const url = channelMessageDeepLink('19:channel@thread.tacv2', 'reply-123', 'tenant-guid', 'team-guid', 'root-msg-456');
    expect(url).toContain('parentMessageId=root-msg-456');
  });

  it('throws when channelId is empty', () => {
    expect(() => channelMessageDeepLink('', 'msg-1', 'tenant-1', 'team-1')).toThrow('channelId is required');
  });

  it('throws when teamId is empty', () => {
    expect(() => channelMessageDeepLink('19:ch@thread.tacv2', 'msg-1', 'tenant-1', '')).toThrow('teamId is required');
  });
});

describe('stripHtml', () => {
  it('removes HTML tags', () => {
    expect(stripHtml('<p>Hello <b>world</b></p>')).toBe('Hello world');
  });

  it('converts <br> to a space', () => {
    expect(stripHtml('line1<br/>line2')).toBe('line1 line2');
  });

  it('decodes common HTML entities', () => {
    expect(stripHtml('AT&amp;T &lt;3 &quot;quotes&quot;')).toBe('AT&T <3 "quotes"');
  });

  it('collapses multiple whitespace', () => {
    expect(stripHtml('  too   many   spaces  ')).toBe('too many spaces');
  });

  it('returns empty string for empty input', () => {
    expect(stripHtml('')).toBe('');
  });
});

describe('truncate', () => {
  it('returns the original string if within limit', () => {
    expect(truncate('short', 100)).toBe('short');
  });

  it('truncates with ellipsis at maxLength', () => {
    const result = truncate('a'.repeat(101), 100);
    expect(result).toHaveLength(100);
    expect(result.endsWith('…')).toBe(true);
  });

  it('uses 100 as default maxLength', () => {
    const result = truncate('a'.repeat(200));
    expect(result).toHaveLength(100);
  });

  it('returns string exactly at limit unchanged', () => {
    const s = 'a'.repeat(100);
    expect(truncate(s, 100)).toBe(s);
  });
});

describe('teamsAppLink', () => {
  it('converts a teams.microsoft.com web URL to msteams:// protocol', () => {
    const webUrl = 'https://teams.microsoft.com/l/chat/19%3Aabc%40thread.v2/0?tenantId=tenant-1';
    const result = teamsAppLink(webUrl);
    expect(result).toBe('msteams://teams.microsoft.com/l/chat/19%3Aabc%40thread.v2/0?tenantId=tenant-1');
  });

  it('returns original URL if not a teams.microsoft.com URL', () => {
    const url = 'https://example.com/page';
    expect(teamsAppLink(url)).toBe(url);
  });

  it('handles https://teams.microsoft.com without a path', () => {
    const url = 'https://teams.microsoft.com';
    expect(teamsAppLink(url)).toBe('msteams://teams.microsoft.com');
  });
});

describe('sortChatsUnreadFirst', () => {
  function makeChat(overrides: Partial<import('../../../src/shared/types').Chat>): import('../../../src/shared/types').Chat {
    return {
      id: 'chat-1',
      tenantId: 'tenant-1',
      chatType: 'oneOnOne',
      topic: null,
      memberNames: [],
      lastMessagePreviewText: null,
      lastMessagePreviewSender: null,
      lastMessageAt: null,
      lastReadAt: null,
      isHidden: false,
      webUrl: null,
      lastPolledAt: null,
      updatedAt: '2024-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  it('puts unread chats before read chats', () => {
    const read = makeChat({ id: 'read', lastMessageAt: '2024-01-01T12:00:00Z', lastReadAt: '2024-01-01T13:00:00Z' });
    const unread = makeChat({ id: 'unread', lastMessageAt: '2024-01-01T10:00:00Z', lastReadAt: '2024-01-01T09:00:00Z' });
    const sorted = sortChatsUnreadFirst([read, unread]);
    expect(sorted[0].id).toBe('unread');
    expect(sorted[1].id).toBe('read');
  });

  it('sorts unread chats by lastMessageAt descending', () => {
    const older = makeChat({ id: 'older', lastMessageAt: '2024-01-01T10:00:00Z', lastReadAt: null });
    const newer = makeChat({ id: 'newer', lastMessageAt: '2024-01-01T12:00:00Z', lastReadAt: null });
    const sorted = sortChatsUnreadFirst([older, newer]);
    expect(sorted[0].id).toBe('newer');
    expect(sorted[1].id).toBe('older');
  });

  it('sorts read chats by lastMessageAt descending', () => {
    const older = makeChat({ id: 'older', lastMessageAt: '2024-01-01T08:00:00Z', lastReadAt: '2024-01-01T09:00:00Z' });
    const newer = makeChat({ id: 'newer', lastMessageAt: '2024-01-01T10:00:00Z', lastReadAt: '2024-01-01T11:00:00Z' });
    const sorted = sortChatsUnreadFirst([older, newer]);
    expect(sorted[0].id).toBe('newer');
    expect(sorted[1].id).toBe('older');
  });

  it('treats null lastReadAt as unread', () => {
    const readChat = makeChat({ id: 'read', lastMessageAt: '2024-01-01T12:00:00Z', lastReadAt: '2024-01-01T13:00:00Z' });
    const nullRead = makeChat({ id: 'null-read', lastMessageAt: '2024-01-01T10:00:00Z', lastReadAt: null });
    const sorted = sortChatsUnreadFirst([readChat, nullRead]);
    expect(sorted[0].id).toBe('null-read');
  });

  it('does not mutate the original array', () => {
    const chats = [
      makeChat({ id: 'a', lastMessageAt: '2024-01-01T10:00:00Z', lastReadAt: '2024-01-01T11:00:00Z' }),
      makeChat({ id: 'b', lastMessageAt: '2024-01-01T12:00:00Z', lastReadAt: null }),
    ];
    const original = [...chats];
    sortChatsUnreadFirst(chats);
    expect(chats).toEqual(original);
  });
});
