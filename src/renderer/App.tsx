import React, { useState, useEffect } from 'react';
import { ChatsPage } from './pages/ChatsPage';
import { SettingsPage } from './pages/SettingsPage';
import { useChats } from './hooks/useChats';
import { useAppStore } from './store/app-store';
import { ipc } from './api/ipc-client';
import { getTheme } from '@shared/themes';
import type { ThemeColors } from '@shared/themes';

type Page = 'chats' | 'settings';

function StatusBar({ colors }: { colors: ThemeColors }): React.ReactElement {
  const { tenants, syncingTenants, errorTenants } = useAppStore();
  const syncing = syncingTenants.size > 0;
  const hasErrors = Object.keys(errorTenants).length > 0;

  if (tenants.length === 0) return <></>;

  return (
    <div style={{ padding: '3px 14px', fontSize: '11px', backgroundColor: colors.statusBarBg, borderBottom: `1px solid ${colors.statusBarBorder}`, flexShrink: 0 }}>
      {syncing && <span style={{ color: colors.navActiveText }}>⟳ Syncing…</span>}
      {hasErrors && !syncing && <span style={{ color: '#c06060' }}>⚠ Sync error</span>}
      {!syncing && !hasErrors && <span style={{ color: '#507050' }}>● Live</span>}
    </div>
  );
}

export default function App(): React.ReactElement {
  const [page, setPage] = useState<Page>('chats');
  const { settings, setSettings } = useAppStore();
  const theme = getTheme(settings.theme);
  const c = theme.colors;

  // Load persisted settings once on startup
  useEffect(() => {
    ipc.settings.get().then(setSettings).catch(console.error);
  }, []);

  // Wire up all IPC subscriptions
  useChats();

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      fontSize: '14px',
      backgroundColor: c.bg,
      color: c.text,
      overflow: 'hidden',
    }}>
      <nav style={{
        display: 'flex',
        borderBottom: `1px solid ${c.border}`,
        backgroundColor: c.navBg,
        flexShrink: 0,
      }}>
        <button
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            color: page === 'chats' ? c.navActiveText : c.navText,
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            borderBottom: page === 'chats' ? `2px solid ${c.navActiveBorder}` : '2px solid transparent',
          }}
          onClick={() => setPage('chats')}
        >
          Chats
        </button>
        <button
          style={{
            flex: 1,
            padding: '12px',
            background: 'none',
            border: 'none',
            color: page === 'settings' ? c.navActiveText : c.navText,
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            borderBottom: page === 'settings' ? `2px solid ${c.navActiveBorder}` : '2px solid transparent',
          }}
          onClick={() => setPage('settings')}
        >
          Settings
        </button>
      </nav>

      <StatusBar colors={c} />

      <main style={{
        flex: 1,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}>
        {page === 'chats' ? <ChatsPage /> : <SettingsPage />}
      </main>
    </div>
  );
}
