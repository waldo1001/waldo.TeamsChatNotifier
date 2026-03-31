import { describe, it, expect } from 'vitest';
import {
  detectChangedChats,
  shouldNotify,
  buildMessageFromGraphResponse,
  buildChatFromGraphResponse,
  buildChannelFromGraphResponse,
  buildMessageFromChannelResponse,
  detectChangedChannelMessages,
} from '../../../../src/main/polling/poll-worker';
import type { Chat } from '../../../../src/shared/types';
import type { GraphChannelMessage, GraphChannel } from '../../../../src/main/polling/poll-worker';

// ── detectChangedChats ──────────────────────────────────────────────────────

describe('detectChangedChats', () => {
  function storedChat(id: string, lastMessageAt: string | null): Chat {
    return {
      id,
      tenantId: 'tenant-001',
      chatType: 'oneOnOne',
      topic: null,
      memberNames: [],
      lastMessagePreviewText: null,
      lastMessagePreviewSender: null,
      lastMessageAt,
      lastReadAt: null,
      isHidden: false,
      webUrl: null,
      lastPolledAt: null,
      updatedAt: '2024-01-01T00:00:00.000Z',
    };
  }

  type GraphChat = { id: string; lastMessagePreview?: { createdDateTime?: string } | null };

  it('returns chats where lastMessageAt is newer than stored', () => {
    const stored = [storedChat('chat-1', '2024-01-01T10:00:00.000Z')];
    const fetched: GraphChat[] = [
      { id: 'chat-1', lastMessagePreview: { createdDateTime: '2024-01-01T11:00:00.000Z' } },
    ];
    expect(detectChangedChats(fetched, stored)).toHaveLength(1);
  });

  it('ignores chats with identical lastMessageAt', () => {
    const stored = [storedChat('chat-1', '2024-01-01T10:00:00.000Z')];
    const fetched: GraphChat[] = [
      { id: 'chat-1', lastMessagePreview: { createdDateTime: '2024-01-01T10:00:00.000Z' } },
    ];
    expect(detectChangedChats(fetched, stored)).toHaveLength(0);
  });

  it('treats null stored timestamp as always-changed', () => {
    const stored = [storedChat('chat-1', null)];
    const fetched: GraphChat[] = [
      { id: 'chat-1', lastMessagePreview: { createdDateTime: '2024-01-01T10:00:00.000Z' } },
    ];
    expect(detectChangedChats(fetched, stored)).toHaveLength(1);
  });

  it('includes new chats not present in stored list', () => {
    const stored: Chat[] = [];
    const fetched: GraphChat[] = [
      { id: 'chat-new', lastMessagePreview: { createdDateTime: '2024-01-01T10:00:00.000Z' } },
    ];
    expect(detectChangedChats(fetched, stored)).toHaveLength(1);
  });

  it('handles chats with null lastMessagePreview gracefully', () => {
    const stored = [storedChat('chat-1', '2024-01-01T10:00:00.000Z')];
    const fetched: GraphChat[] = [{ id: 'chat-1', lastMessagePreview: null }];
    expect(detectChangedChats(fetched, stored)).toHaveLength(0);
  });

  it('handles empty fetched list', () => {
    const stored = [storedChat('chat-1', '2024-01-01T10:00:00.000Z')];
    expect(detectChangedChats([], stored)).toHaveLength(0);
  });
});

// ── shouldNotify ────────────────────────────────────────────────────────────

describe('shouldNotify', () => {
  type GraphMessage = {
    messageType?: string;
    from?: { user?: { id?: string } } | null;
  };

  it('returns true for a regular message from another user', () => {
    const msg: GraphMessage = {
      messageType: 'message',
      from: { user: { id: 'other-user' } },
    };
    expect(shouldNotify(msg, 'current-user-id', false)).toBe(true);
  });

  it('returns false for system event messages', () => {
    const msg: GraphMessage = { messageType: 'systemEventMessage', from: null };
    expect(shouldNotify(msg, 'current-user-id', false)).toBe(false);
  });

  it('returns false for messages sent by the signed-in user', () => {
    const msg: GraphMessage = {
      messageType: 'message',
      from: { user: { id: 'current-user-id' } },
    };
    expect(shouldNotify(msg, 'current-user-id', false)).toBe(false);
  });

  it('returns false if already notified', () => {
    const msg: GraphMessage = {
      messageType: 'message',
      from: { user: { id: 'other-user' } },
    };
    expect(shouldNotify(msg, 'current-user-id', true)).toBe(false);
  });

  it('returns false for unknown messageType', () => {
    const msg: GraphMessage = { messageType: 'unknownFutureValue', from: null };
    expect(shouldNotify(msg, 'current-user-id', false)).toBe(false);
  });

  it('returns false when from is null (anonymous/system)', () => {
    const msg: GraphMessage = { messageType: 'message', from: null };
    expect(shouldNotify(msg, 'current-user-id', false)).toBe(false);
  });
});

// ── buildMessageFromGraphResponse ───────────────────────────────────────────

describe('buildMessageFromGraphResponse', () => {
  it('strips HTML from body content', () => {
    const raw = {
      id: 'msg-1',
      from: { user: { id: 'user-1', displayName: 'Alice' } },
      body: { content: '<p>Hello <b>world</b></p>', contentType: 'html' },
      createdDateTime: '2024-01-01T10:00:00.000Z',
      messageType: 'message',
    };
    const msg = buildMessageFromGraphResponse(raw, 'chat-1', 'tenant-1');
    expect(msg.bodyContent).toBe('Hello world');
  });

  it('marks system messages correctly', () => {
    const raw = {
      id: 'msg-sys',
      from: null,
      body: { content: 'Alice added Bob', contentType: 'text' },
      createdDateTime: '2024-01-01T10:00:00.000Z',
      messageType: 'systemEventMessage',
    };
    const msg = buildMessageFromGraphResponse(raw, 'chat-1', 'tenant-1');
    expect(msg.isSystemMessage).toBe(true);
  });

  it('maps sender ID and display name', () => {
    const raw = {
      id: 'msg-1',
      from: { user: { id: 'user-bob', displayName: 'Bob Smith' } },
      body: { content: 'Hi', contentType: 'text' },
      createdDateTime: '2024-01-01T10:00:00.000Z',
      messageType: 'message',
    };
    const msg = buildMessageFromGraphResponse(raw, 'chat-1', 'tenant-1');
    expect(msg.senderId).toBe('user-bob');
    expect(msg.senderDisplayName).toBe('Bob Smith');
  });

  it('initializes notified to false', () => {
    const raw = {
      id: 'msg-1',
      from: { user: { id: 'user-1', displayName: 'Alice' } },
      body: { content: 'test', contentType: 'text' },
      createdDateTime: '2024-01-01T10:00:00.000Z',
      messageType: 'message',
    };
    const msg = buildMessageFromGraphResponse(raw, 'chat-1', 'tenant-1');
    expect(msg.notified).toBe(false);
  });
});

// ── buildChatFromGraphResponse ──────────────────────────────────────────────

describe('buildChatFromGraphResponse', () => {
  it('maps basic fields from a oneOnOne chat', () => {
    const raw = {
      id: 'chat-1',
      chatType: 'oneOnOne',
      topic: null,
      webUrl: 'https://teams.microsoft.com/l/chat/chat-1',
      members: [{ displayName: 'Alice' }, { displayName: 'Bob' }],
      lastMessagePreview: {
        createdDateTime: '2024-06-15T10:30:00.000Z',
        body: { content: 'Hello!' },
        from: { user: { displayName: 'Alice' } },
      },
      viewpoint: {
        lastMessageReadDateTime: '2024-06-15T10:00:00.000Z',
        isHidden: false,
      },
    };
    const chat = buildChatFromGraphResponse(raw, 'tenant-1');
    expect(chat.id).toBe('chat-1');
    expect(chat.tenantId).toBe('tenant-1');
    expect(chat.chatType).toBe('oneOnOne');
    expect(chat.topic).toBeNull();
    expect(chat.memberNames).toEqual(['Alice', 'Bob']);
    expect(chat.lastMessagePreviewText).toBe('Hello!');
    expect(chat.lastMessagePreviewSender).toBe('Alice');
    expect(chat.lastMessageAt).toBe('2024-06-15T10:30:00.000Z');
    expect(chat.lastReadAt).toBe('2024-06-15T10:00:00.000Z');
    expect(chat.isHidden).toBe(false);
    expect(chat.webUrl).toBe('https://teams.microsoft.com/l/chat/chat-1');
  });

  it('strips HTML from lastMessagePreview body', () => {
    const raw = {
      id: 'chat-2',
      chatType: 'group',
      topic: 'Project X',
      lastMessagePreview: {
        createdDateTime: '2024-06-15T10:30:00.000Z',
        body: { content: '<p>Check this <b>out</b></p>' },
        from: { user: { displayName: 'Bob' } },
      },
      members: [],
    };
    const chat = buildChatFromGraphResponse(raw, 'tenant-1');
    expect(chat.lastMessagePreviewText).toBe('Check this out');
  });

  it('handles missing optional fields gracefully', () => {
    const raw = {
      id: 'chat-3',
      chatType: 'oneOnOne',
    };
    const chat = buildChatFromGraphResponse(raw, 'tenant-1');
    expect(chat.topic).toBeNull();
    expect(chat.memberNames).toEqual([]);
    expect(chat.lastMessagePreviewText).toBeNull();
    expect(chat.lastMessagePreviewSender).toBeNull();
    expect(chat.lastMessageAt).toBeNull();
    expect(chat.lastReadAt).toBeNull();
    expect(chat.isHidden).toBe(false);
    expect(chat.webUrl).toBeNull();
    expect(chat.lastPolledAt).toBeNull();
  });

  it('filters out members with empty display names', () => {
    const raw = {
      id: 'chat-4',
      chatType: 'group',
      members: [
        { displayName: 'Alice' },
        { displayName: '' },
        { displayName: 'Charlie' },
      ],
    };
    const chat = buildChatFromGraphResponse(raw, 'tenant-1');
    expect(chat.memberNames).toEqual(['Alice', 'Charlie']);
  });

  it('maps hidden chats from viewpoint', () => {
    const raw = {
      id: 'chat-5',
      chatType: 'oneOnOne',
      viewpoint: { isHidden: true, lastMessageReadDateTime: null },
    };
    const chat = buildChatFromGraphResponse(raw, 'tenant-1');
    expect(chat.isHidden).toBe(true);
  });
});

// ── buildChannelFromGraphResponse ───────────────────────────────────────────

describe('buildChannelFromGraphResponse', () => {
  it('maps basic fields from a standard channel', () => {
    const raw: GraphChannel = {
      id: 'ch-1',
      displayName: 'General',
      webUrl: 'https://teams.microsoft.com/l/channel/ch-1',
      membershipType: 'standard',
    };
    const channel = buildChannelFromGraphResponse(raw, 'team-1', 'tenant-1');
    expect(channel.id).toBe('ch-1');
    expect(channel.teamId).toBe('team-1');
    expect(channel.tenantId).toBe('tenant-1');
    expect(channel.displayName).toBe('General');
    expect(channel.webUrl).toBe('https://teams.microsoft.com/l/channel/ch-1');
    expect(channel.membershipType).toBe('standard');
  });

  it('handles missing optional fields', () => {
    const raw: GraphChannel = {
      id: 'ch-2',
    };
    const channel = buildChannelFromGraphResponse(raw, 'team-1', 'tenant-1');
    expect(channel.displayName).toBe('');
    expect(channel.webUrl).toBeNull();
    expect(channel.membershipType).toBe('standard');
  });
});

// ── buildMessageFromChannelResponse ─────────────────────────────────────────

describe('buildMessageFromChannelResponse', () => {
  it('maps channel message fields including channelId and teamId', () => {
    const raw: GraphChannelMessage = {
      id: 'msg-ch-1',
      messageType: 'message',
      from: { user: { id: 'user-1', displayName: 'Alice' } },
      body: { content: 'Thread root', contentType: 'text' },
      createdDateTime: '2024-06-15T10:00:00.000Z',
    };
    const msg = buildMessageFromChannelResponse(raw, 'ch-1', 'team-1', 'tenant-1');
    expect(msg.id).toBe('msg-ch-1');
    expect(msg.chatId).toBe('ch-1');
    expect(msg.tenantId).toBe('tenant-1');
    expect(msg.channelId).toBe('ch-1');
    expect(msg.teamId).toBe('team-1');
    expect(msg.bodyContent).toBe('Thread root');
    expect(msg.parentMessageId).toBeNull();
    expect(msg.notified).toBe(false);
  });

  it('maps parentMessageId for thread replies', () => {
    const raw: GraphChannelMessage = {
      id: 'reply-1',
      messageType: 'message',
      from: { user: { id: 'user-2', displayName: 'Bob' } },
      body: { content: 'A reply!', contentType: 'text' },
      createdDateTime: '2024-06-15T10:05:00.000Z',
      replyToId: 'msg-ch-1',
    };
    const msg = buildMessageFromChannelResponse(raw, 'ch-1', 'team-1', 'tenant-1');
    expect(msg.parentMessageId).toBe('msg-ch-1');
  });

  it('strips HTML from body content', () => {
    const raw: GraphChannelMessage = {
      id: 'msg-html',
      messageType: 'message',
      from: { user: { id: 'user-1', displayName: 'Alice' } },
      body: { content: '<p>Bold <b>text</b></p>', contentType: 'html' },
      createdDateTime: '2024-06-15T10:00:00.000Z',
    };
    const msg = buildMessageFromChannelResponse(raw, 'ch-1', 'team-1', 'tenant-1');
    expect(msg.bodyContent).toBe('Bold text');
  });

  it('marks system messages as isSystemMessage', () => {
    const raw: GraphChannelMessage = {
      id: 'msg-sys',
      messageType: 'systemEventMessage',
      from: null,
      body: { content: 'User joined', contentType: 'text' },
      createdDateTime: '2024-06-15T10:00:00.000Z',
    };
    const msg = buildMessageFromChannelResponse(raw, 'ch-1', 'team-1', 'tenant-1');
    expect(msg.isSystemMessage).toBe(true);
  });
});

// ── detectChangedChannelMessages ────────────────────────────────────────────

describe('detectChangedChannelMessages', () => {
  it('returns messages newer than the given cutoff', () => {
    const messages: GraphChannelMessage[] = [
      { id: 'msg-1', createdDateTime: '2024-06-15T11:00:00.000Z', messageType: 'message' },
      { id: 'msg-2', createdDateTime: '2024-06-15T09:00:00.000Z', messageType: 'message' },
    ];
    const result = detectChangedChannelMessages(messages, '2024-06-15T10:00:00.000Z');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('msg-1');
  });

  it('returns empty array when all messages are older than cutoff', () => {
    const messages: GraphChannelMessage[] = [
      { id: 'msg-1', createdDateTime: '2024-06-15T08:00:00.000Z', messageType: 'message' },
    ];
    const result = detectChangedChannelMessages(messages, '2024-06-15T10:00:00.000Z');
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty messages list', () => {
    expect(detectChangedChannelMessages([], '2024-06-15T10:00:00.000Z')).toHaveLength(0);
  });

  it('excludes system event messages', () => {
    const messages: GraphChannelMessage[] = [
      { id: 'msg-1', createdDateTime: '2024-06-15T11:00:00.000Z', messageType: 'systemEventMessage' },
      { id: 'msg-2', createdDateTime: '2024-06-15T11:00:00.000Z', messageType: 'message' },
    ];
    const result = detectChangedChannelMessages(messages, '2024-06-15T10:00:00.000Z');
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('msg-2');
  });

  it('handles messages with missing createdDateTime gracefully', () => {
    const messages: GraphChannelMessage[] = [
      { id: 'msg-1', messageType: 'message' },
    ];
    const result = detectChangedChannelMessages(messages, '2024-06-15T10:00:00.000Z');
    expect(result).toHaveLength(0);
  });
});
