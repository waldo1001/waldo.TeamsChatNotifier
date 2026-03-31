import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We mock the Graph client — no real HTTP calls in unit tests
const mockGet = vi.fn();
const mockSelect = vi.fn().mockReturnThis();
const mockExpand = vi.fn().mockReturnThis();
const mockOrderby = vi.fn().mockReturnThis();
const mockTop = vi.fn().mockReturnThis();
const mockFilter = vi.fn().mockReturnThis();
const mockHeader = vi.fn().mockReturnThis();

const mockApi = vi.fn().mockReturnValue({
  select: mockSelect,
  expand: mockExpand,
  orderby: mockOrderby,
  top: mockTop,
  filter: mockFilter,
  header: mockHeader,
  get: mockGet,
});

vi.mock('@microsoft/microsoft-graph-client', () => ({
  Client: {
    initWithMiddleware: vi.fn().mockReturnValue({ api: mockApi }),
  },
  TokenCredentialAuthenticationProvider: vi.fn(),
}));

import { ChatsApi } from '../../../../src/main/graph/chats-api';
import type { Client } from '@microsoft/microsoft-graph-client';

describe('ChatsApi', () => {
  let api: ChatsApi;
  let fakeClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
    // Re-wire chain after clearAllMocks resets return values
    const chain = {
      select: mockSelect,
      expand: mockExpand,
      orderby: mockOrderby,
      top: mockTop,
      filter: mockFilter,
      header: mockHeader,
      get: mockGet,
    };
    mockSelect.mockReturnValue(chain);
    mockExpand.mockReturnValue(chain);
    mockOrderby.mockReturnValue(chain);
    mockTop.mockReturnValue(chain);
    mockFilter.mockReturnValue(chain);
    mockHeader.mockReturnValue(chain);
    mockApi.mockReturnValue(chain);
    fakeClient = { api: mockApi } as unknown as Client;
    api = new ChatsApi(fakeClient);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls /me/chats with correct query params', async () => {
    mockGet.mockResolvedValueOnce({ value: [] });
    await api.listChats();
    expect(mockApi).toHaveBeenCalledWith('/me/chats');
    expect(mockExpand).toHaveBeenCalledWith(
      expect.stringContaining('lastMessagePreview'),
    );
  });

  it('returns an empty array when no chats exist', async () => {
    mockGet.mockResolvedValueOnce({ value: [] });
    const result = await api.listChats();
    expect(result).toEqual([]);
  });

  it('returns chats from the value array', async () => {
    const mockChats = [
      { id: 'chat-1', chatType: 'oneOnOne', lastMessagePreview: null },
      { id: 'chat-2', chatType: 'group', lastMessagePreview: null },
    ];
    mockGet.mockResolvedValueOnce({ value: mockChats });
    const result = await api.listChats();
    expect(result).toHaveLength(2);
    expect(result[0].id).toBe('chat-1');
  });

  it('follows nextLink for pagination', async () => {
    const page1 = {
      value: [{ id: 'chat-1' }],
      '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/chats?$skiptoken=abc',
    };
    const page2 = { value: [{ id: 'chat-2' }] };
    mockGet
      .mockResolvedValueOnce(page1)
      .mockResolvedValueOnce(page2);
    const result = await api.listChats();
    expect(result).toHaveLength(2);
    expect(result.map((c: { id: string }) => c.id)).toEqual(['chat-1', 'chat-2']);
  });

  it('throws on Graph API error', async () => {
    mockGet.mockRejectedValueOnce(new Error('Graph API 403'));
    await expect(api.listChats()).rejects.toThrow('Graph API 403');
  });
});
