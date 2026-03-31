import React, { useState } from 'react';
import { ChatsPage } from './pages/ChatsPage';
import { SettingsPage } from './pages/SettingsPage';
import { useChats } from './hooks/useChats';
import { useAppStore } from './store/app-store';

type Page = 'chats' | 'settings';

function StatusBar(): React.ReactElement {
  const { tenants, syncingTenants, errorTenants } = useAppStore();
  const syncing = syncingTenants.size > 0;
  const hasErrors = Object.keys(errorTenants).length > 0;

  if (tenants.length === 0) return <></>;

  return (
    <div style={styles.statusBar}>
      {syncing && <span style={styles.syncing}>⟳ Syncing…</span>}
      {hasErrors && !syncing && <span style={styles.error}>⚠ Sync error</span>}
      {!syncing && !hasErrors && <span style={styles.ok}>● Live</span>}
    </div>
  );
}

export default function App(): React.ReactElement {
  const [page, setPage] = useState<Page>('chats');

  // Wire up all IPC subscriptions
  useChats();

  return (
    <div style={styles.container}>
      <nav style={styles.nav}>
        <button
          style={{ ...styles.navBtn, ...(page === 'chats' ? styles.navBtnActive : {}) }}
          onClick={() => setPage('chats')}
        >
          Chats
        </button>
        <button
          style={{ ...styles.navBtn, ...(page === 'settings' ? styles.navBtnActive : {}) }}
          onClick={() => setPage('settings')}
        >
          Settings
        </button>
      </nav>

      <StatusBar />

      <main style={styles.main}>
        {page === 'chats' ? <ChatsPage /> : <SettingsPage />}
      </main>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100vh',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    fontSize: '14px',
    backgroundColor: '#1a1a2e',
    color: '#e0e0e0',
    overflow: 'hidden',
  },
  nav: {
    display: 'flex',
    borderBottom: '1px solid #2d2d4e',
    backgroundColor: '#16213e',
    flexShrink: 0,
  },
  navBtn: {
    flex: 1,
    padding: '12px',
    background: 'none',
    border: 'none',
    color: '#9090b0',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
  },
  navBtnActive: {
    color: '#6c8ebf',
    borderBottom: '2px solid #6c8ebf',
  },
  main: {
    flex: 1,
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
  },
  statusBar: {
    padding: '3px 14px',
    fontSize: '11px',
    backgroundColor: '#12122a',
    borderBottom: '1px solid #1e1e3a',
    flexShrink: 0,
  },
  syncing: { color: '#6080c0' },
  error: { color: '#c06060' },
  ok: { color: '#507050' },
};
