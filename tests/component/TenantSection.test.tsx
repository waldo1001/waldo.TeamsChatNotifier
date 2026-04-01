import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TenantSection } from '../../src/renderer/components/TenantSection';
import type { Tenant, Chat } from '../../src/shared/types';

const mockTenant: Tenant = {
  id: 'tenant-001',
  displayName: 'Contoso Corp',
  userPrincipalName: 'alice@contoso.com',
  userId: 'user-001',
  addedAt: '2024-01-01T00:00:00.000Z',
  lastSyncedAt: '2024-01-01T12:00:00.000Z',
};

function makeChat(id: string, unread = false): Chat {
  const now = Date.now();
  return {
    id,
    tenantId: 'tenant-001',
    chatType: 'oneOnOne',
    topic: null,
    memberNames: ['Alice', 'Bob'],
    lastMessagePreviewText: 'Hello',
    lastMessagePreviewSender: 'Alice',
    lastMessageAt: new Date(now - (unread ? 1000 : 60000)).toISOString(),
    lastReadAt: new Date(now - 30000).toISOString(),
    isHidden: false,
    webUrl: `https://teams.microsoft.com/l/chat/${id}/0`,
    lastPolledAt: null,
    updatedAt: new Date().toISOString(),
  };
}

describe('TenantSection', () => {
  it('renders the tenant display name', () => {
    render(
      <TenantSection tenant={mockTenant} chats={[]} currentUserDisplayName="Alice" onOpen={vi.fn()} onOpenWeb={vi.fn()} />,
    );
    expect(screen.getByText('Contoso Corp')).toBeInTheDocument();
  });

  it('renders the user principal name', () => {
    render(
      <TenantSection tenant={mockTenant} chats={[]} currentUserDisplayName="Alice" onOpen={vi.fn()} onOpenWeb={vi.fn()} />,
    );
    expect(screen.getByText('alice@contoso.com')).toBeInTheDocument();
  });

  it('shows chat count badge when there are unread messages', () => {
    const chats = [makeChat('c1', true), makeChat('c2', false)];
    render(
      <TenantSection
        tenant={mockTenant}
        chats={chats}
        currentUserDisplayName="Bob"
        onOpen={vi.fn()}
        onOpenWeb={vi.fn()}
      />,
    );
    // The unread badge should show count
    expect(screen.getByTestId('unread-badge')).toBeInTheDocument();
  });

  it('renders all chats in the section', () => {
    const chats = [makeChat('c1'), makeChat('c2'), makeChat('c3')];
    render(
      <TenantSection
        tenant={mockTenant}
        chats={chats}
        currentUserDisplayName="Bob"
        onOpen={vi.fn()}
        onOpenWeb={vi.fn()}
      />,
    );
    // All 3 chat items should have an "Open in Teams app" button
    expect(screen.getAllByRole('button', { name: /open in teams app/i })).toHaveLength(3);
    // All 3 chat items should have an "Open in browser" button
    expect(screen.getAllByRole('button', { name: /open in browser/i })).toHaveLength(3);
  });

  it('shows empty state when no chats', () => {
    render(
      <TenantSection tenant={mockTenant} chats={[]} currentUserDisplayName="Alice" onOpen={vi.fn()} onOpenWeb={vi.fn()} />,
    );
    expect(screen.getByText(/no chats/i)).toBeInTheDocument();
  });

  it('collapses and expands on header click', () => {
    const chats = [makeChat('c1')];
    render(
      <TenantSection
        tenant={mockTenant}
        chats={chats}
        currentUserDisplayName="Bob"
        onOpen={vi.fn()}
        onOpenWeb={vi.fn()}
      />,
    );
    // Initially expanded — button is visible
    expect(screen.getByRole('button', { name: /open in teams app/i })).toBeInTheDocument();

    // Click header to collapse
    fireEvent.click(screen.getByTestId('tenant-header'));
    expect(screen.queryByRole('button', { name: /open in teams app/i })).not.toBeInTheDocument();

    // Click again to re-expand
    fireEvent.click(screen.getByTestId('tenant-header'));
    expect(screen.getByRole('button', { name: /open in teams app/i })).toBeInTheDocument();
  });
});
