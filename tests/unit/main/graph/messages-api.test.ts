import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockGet = vi.fn();
const mockFilter = vi.fn().mockReturnThis();
const mockOrderby = vi.fn().mockReturnThis();
const mockTop = vi.fn().mockReturnThis();
const mockSelect = vi.fn().mockReturnThis();

const mockApi = vi.fn().mockReturnValue({
  filter: mockFilter,
  orderby: mockOrderby,
  top: mockTop,
  select: mockSelect,
  get: mockGet,
});

vi.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    initWithMiddleware: vi.fn().mockReturnValue({ api: mockApi }),
  },
}));

import { MessagesApi } from '../../../../src/main/graph/messages-api';
import type { Client } from '@microsoft/microsoft-graph-client';

describe('MessagesApi', () => {
  let api: MessagesApi;
  let fakeClient: Client;

  beforeEach(() => {
    fakeClient = { api: mockApi } as unknown as Client;
    api = new MessagesApi(fakeClient);
    vi.clearAllMocks();
    mockFilter.mockReturnThis();
    mockOrderby.mockReturnThis();
    mockTop.mockReturnThis();
    mockSelect.mockReturnThis();
  });

  it('calls the correct chat messages endpoint', async () => {
    mockGet.mockResolvedValueOnce({ value: [] });
    await api.listMessages('chat-abc', '2024-01-01T00:00:00.000Z');
    expect(mockApi).toHaveBeenCalledWith('/chats/chat-abc/messages');
  });

  it('applies a filter for messages after the given timestamp', async () => {
    mockGet.mockResolvedValueOnce({ value: [] });
    await api.listMessages('chat-abc', '2024-01-01T00:00:00.000Z');
    expect(mockFilter).toHaveBeenCalledWith(
      expect.stringContaining('2024-01-01T00:00:00.000Z'),
    );
  });

  it('returns an empty array when no messages exist', async () => {
    mockGet.mockResolvedValueOnce({ value: [] });
    const result = await api.listMessages('chat-abc', '2024-01-01T00:00:00.000Z');
    expect(result).toEqual([]);
  });

  it('returns messages from the value array', async () => {
    const mockMessages = [
      { id: 'msg-1', messageType: 'message', body: { content: 'Hello', contentType: 'text' } },
      { id: 'msg-2', messageType: 'message', body: { content: 'World', contentType: 'text' } },
    ];
    mockGet.mockResolvedValueOnce({ value: mockMessages });
    const result = await api.listMessages('chat-abc', '2024-01-01T00:00:00.000Z');
    expect(result).toHaveLength(2);
  });

  it('throws on Graph API error', async () => {
    mockGet.mockRejectedValueOnce(new Error('Graph API 404'));
    await expect(api.listMessages('chat-abc', '2024-01-01T00:00:00.000Z')).rejects.toThrow(
      'Graph API 404',
    );
  });
});
