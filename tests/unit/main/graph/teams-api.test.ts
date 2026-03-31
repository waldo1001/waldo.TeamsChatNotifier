import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Graph client chain
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
}));

import { TeamsApi } from '../../../../src/main/graph/teams-api';
import type { Client } from '@microsoft/microsoft-graph-client';

describe('TeamsApi', () => {
  let api: TeamsApi;
  let fakeClient: Client;

  beforeEach(() => {
    vi.clearAllMocks();
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
    api = new TeamsApi(fakeClient);
  });

  // ── listJoinedTeams ─────────────────────────────────────────────────────

  describe('listJoinedTeams', () => {
    it('calls /me/joinedTeams endpoint', async () => {
      mockGet.mockResolvedValueOnce({ value: [] });
      await api.listJoinedTeams();
      expect(mockApi).toHaveBeenCalledWith('/me/joinedTeams');
    });

    it('returns an empty array when user has no teams', async () => {
      mockGet.mockResolvedValueOnce({ value: [] });
      const result = await api.listJoinedTeams();
      expect(result).toEqual([]);
    });

    it('returns teams from the value array', async () => {
      const mockTeams = [
        { id: 'team-1', displayName: 'Engineering' },
        { id: 'team-2', displayName: 'Marketing' },
      ];
      mockGet.mockResolvedValueOnce({ value: mockTeams });
      const result = await api.listJoinedTeams();
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('team-1');
      expect(result[0].displayName).toBe('Engineering');
    });

    it('follows nextLink for pagination', async () => {
      const page1 = {
        value: [{ id: 'team-1', displayName: 'Team 1' }],
        '@odata.nextLink': 'https://graph.microsoft.com/v1.0/me/joinedTeams?$skiptoken=abc',
      };
      const page2 = { value: [{ id: 'team-2', displayName: 'Team 2' }] };
      mockGet.mockResolvedValueOnce(page1).mockResolvedValueOnce(page2);
      const result = await api.listJoinedTeams();
      expect(result).toHaveLength(2);
      expect(result.map(t => t.id)).toEqual(['team-1', 'team-2']);
    });

    it('throws on Graph API error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Graph API 403'));
      await expect(api.listJoinedTeams()).rejects.toThrow('Graph API 403');
    });
  });

  // ── listChannels ──────────────────────────────────────────────────────────

  describe('listChannels', () => {
    it('calls /teams/{teamId}/channels endpoint', async () => {
      mockGet.mockResolvedValueOnce({ value: [] });
      await api.listChannels('team-abc');
      expect(mockApi).toHaveBeenCalledWith('/teams/team-abc/channels');
    });

    it('returns empty array when team has no channels', async () => {
      mockGet.mockResolvedValueOnce({ value: [] });
      const result = await api.listChannels('team-abc');
      expect(result).toEqual([]);
    });

    it('returns channels from the value array', async () => {
      const mockChannels = [
        { id: 'ch-1', displayName: 'General', webUrl: 'https://teams.microsoft.com/channel/1' },
        { id: 'ch-2', displayName: 'Random', webUrl: 'https://teams.microsoft.com/channel/2' },
      ];
      mockGet.mockResolvedValueOnce({ value: mockChannels });
      const result = await api.listChannels('team-abc');
      expect(result).toHaveLength(2);
      expect(result[0].displayName).toBe('General');
    });

    it('throws on Graph API error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Graph API 404'));
      await expect(api.listChannels('team-abc')).rejects.toThrow('Graph API 404');
    });
  });

  // ── listChannelMessages ────────────────────────────────────────────────

  describe('listChannelMessages', () => {
    it('calls /teams/{teamId}/channels/{channelId}/messages endpoint', async () => {
      mockGet.mockResolvedValueOnce({ value: [] });
      await api.listChannelMessages('team-abc', 'ch-1', '2024-01-01T00:00:00.000Z');
      expect(mockApi).toHaveBeenCalledWith('/teams/team-abc/channels/ch-1/messages');
    });

    it('applies filter for messages after the given timestamp', async () => {
      mockGet.mockResolvedValueOnce({ value: [] });
      await api.listChannelMessages('team-abc', 'ch-1', '2024-01-01T00:00:00.000Z');
      expect(mockFilter).toHaveBeenCalledWith(
        expect.stringContaining('2024-01-01T00:00:00.000Z'),
      );
    });

    it('returns channel messages from the value array', async () => {
      const mockMessages = [
        { id: 'msg-1', messageType: 'message', body: { content: 'Hello', contentType: 'text' } },
        { id: 'msg-2', messageType: 'message', body: { content: 'World', contentType: 'text' } },
      ];
      mockGet.mockResolvedValueOnce({ value: mockMessages });
      const result = await api.listChannelMessages('team-abc', 'ch-1', '2024-01-01T00:00:00.000Z');
      expect(result).toHaveLength(2);
    });

    it('returns empty array when no messages exist', async () => {
      mockGet.mockResolvedValueOnce({ value: [] });
      const result = await api.listChannelMessages('team-abc', 'ch-1', '2024-01-01T00:00:00.000Z');
      expect(result).toEqual([]);
    });

    it('throws on Graph API error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Graph API 500'));
      await expect(
        api.listChannelMessages('team-abc', 'ch-1', '2024-01-01T00:00:00.000Z'),
      ).rejects.toThrow('Graph API 500');
    });
  });

  // ── listMessageReplies ────────────────────────────────────────────────

  describe('listMessageReplies', () => {
    it('calls /teams/{teamId}/channels/{channelId}/messages/{messageId}/replies endpoint', async () => {
      mockGet.mockResolvedValueOnce({ value: [] });
      await api.listMessageReplies('team-abc', 'ch-1', 'msg-root-1', '2024-01-01T00:00:00.000Z');
      expect(mockApi).toHaveBeenCalledWith(
        '/teams/team-abc/channels/ch-1/messages/msg-root-1/replies',
      );
    });

    it('applies filter for replies after the given timestamp', async () => {
      mockGet.mockResolvedValueOnce({ value: [] });
      await api.listMessageReplies('team-abc', 'ch-1', 'msg-root-1', '2024-01-01T00:00:00.000Z');
      expect(mockFilter).toHaveBeenCalledWith(
        expect.stringContaining('2024-01-01T00:00:00.000Z'),
      );
    });

    it('returns replies from the value array', async () => {
      const mockReplies = [
        { id: 'reply-1', messageType: 'message', body: { content: 'Reply!', contentType: 'text' } },
      ];
      mockGet.mockResolvedValueOnce({ value: mockReplies });
      const result = await api.listMessageReplies('team-abc', 'ch-1', 'msg-root-1', '2024-01-01T00:00:00.000Z');
      expect(result).toHaveLength(1);
    });

    it('returns empty array when no replies exist', async () => {
      mockGet.mockResolvedValueOnce({ value: [] });
      const result = await api.listMessageReplies('team-abc', 'ch-1', 'msg-root-1', '2024-01-01T00:00:00.000Z');
      expect(result).toEqual([]);
    });

    it('throws on Graph API error', async () => {
      mockGet.mockRejectedValueOnce(new Error('Graph API 403'));
      await expect(
        api.listMessageReplies('team-abc', 'ch-1', 'msg-root-1', '2024-01-01T00:00:00.000Z'),
      ).rejects.toThrow('Graph API 403');
    });
  });
});
