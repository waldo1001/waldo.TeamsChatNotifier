import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChatListItem } from '../../src/renderer/components/ChatListItem';
import type { Chat } from '../../src/shared/types';

function makeChat(overrides: Partial<Chat> = {}): Chat {
  return {
    id: '19:abc@thread.v2',
    tenantId: 'tenant-001',
    chatType: 'oneOnOne',
    topic: null,
    memberNames: ['Alice Johnson', 'Bob Smith'],
    lastMessagePreviewText: 'Hey, are you free for a call?',
    lastMessagePreviewSender: 'Alice Johnson',
    lastMessageAt: new Date(Date.now() - 2 * 60 * 1000).toISOString(), // 2 min ago
    lastReadAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),   // 10 min ago (unread)
    isHidden: false,
    webUrl: 'https://teams.microsoft.com/l/chat/19%3Aabc/0?tenantId=tenant-001',
    lastPolledAt: null,
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('ChatListItem', () => {
  it('renders the chat name for a 1:1 chat (other person)', () => {
    render(
      <ChatListItem
        chat={makeChat()}
        currentUserDisplayName="Bob Smith"
        onOpen={vi.fn()}
        onOpenWeb={vi.fn()}
      />,
    );
    // Should show the OTHER person's name, not current user
    expect(screen.getByText('Alice Johnson')).toBeInTheDocument();
  });

  it('renders topic for group chats instead of member list', () => {
    render(
      <ChatListItem
        chat={makeChat({ chatType: 'group', topic: 'Project Alpha', memberNames: ['Alice', 'Bob', 'Carol'] })}
        currentUserDisplayName="Alice"
        onOpen={vi.fn()}
        onOpenWeb={vi.fn()}
      />,
    );
    expect(screen.getByText('Project Alpha')).toBeInTheDocument();
  });

  it('shows message preview text', () => {
    render(
      <ChatListItem chat={makeChat()} currentUserDisplayName="Bob Smith" onOpen={vi.fn()} onOpenWeb={vi.fn()} />,
    );
    expect(screen.getByText(/Hey, are you free for a call\?/)).toBeInTheDocument();
  });

  it('shows unread indicator when lastMessageAt > lastReadAt', () => {
    const unreadChat = makeChat({
      lastMessageAt: new Date(Date.now() - 1000).toISOString(),
      lastReadAt: new Date(Date.now() - 60000).toISOString(),
    });
    const { container } = render(
      <ChatListItem chat={unreadChat} currentUserDisplayName="Bob Smith" onOpen={vi.fn()} onOpenWeb={vi.fn()} />,
    );
    expect(container.querySelector('[data-testid="unread-indicator"]')).toBeInTheDocument();
  });

  it('does not show unread indicator when chat is read', () => {
    const readChat = makeChat({
      lastMessageAt: new Date(Date.now() - 60000).toISOString(),
      lastReadAt: new Date(Date.now() - 1000).toISOString(),
    });
    const { container } = render(
      <ChatListItem chat={readChat} currentUserDisplayName="Bob Smith" onOpen={vi.fn()} onOpenWeb={vi.fn()} />,
    );
    expect(container.querySelector('[data-testid="unread-indicator"]')).not.toBeInTheDocument();
  });

  it('calls onOpen with the chat webUrl and chat object when clicked', () => {
    const chat = makeChat();
    const onOpen = vi.fn();
    render(
      <ChatListItem chat={chat} currentUserDisplayName="Bob Smith" onOpen={onOpen} onOpenWeb={vi.fn()} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /open in teams app/i }));
    expect(onOpen).toHaveBeenCalledWith(
      'https://teams.microsoft.com/l/chat/19%3Aabc/0?tenantId=tenant-001',
      chat,
    );
  });

  it('calls onOpenWeb with the chat webUrl and chat object when browser button clicked', () => {
    const chat = makeChat();
    const onOpenWeb = vi.fn();
    render(
      <ChatListItem chat={chat} currentUserDisplayName="Bob Smith" onOpen={vi.fn()} onOpenWeb={onOpenWeb} />,
    );
    fireEvent.click(screen.getByRole('button', { name: /open in browser/i }));
    expect(onOpenWeb).toHaveBeenCalledWith(
      'https://teams.microsoft.com/l/chat/19%3Aabc/0?tenantId=tenant-001',
      chat,
    );
  });

  it('shows a relative timestamp', () => {
    render(
      <ChatListItem chat={makeChat()} currentUserDisplayName="Bob Smith" onOpen={vi.fn()} onOpenWeb={vi.fn()} />,
    );
    // "2m ago" or similar — just check something time-like is present
    expect(screen.getByTestId('chat-timestamp')).toBeInTheDocument();
  });

  it('renders group member names as fallback when no topic', () => {
    render(
      <ChatListItem
        chat={makeChat({ chatType: 'group', topic: null, memberNames: ['Alice', 'Bob', 'Carol'] })}
        currentUserDisplayName="Alice"
        onOpen={vi.fn()}
        onOpenWeb={vi.fn()}
      />,
    );
    // Should show other members: Bob, Carol
    expect(screen.getByText(/Bob, Carol/)).toBeInTheDocument();
  });
});
