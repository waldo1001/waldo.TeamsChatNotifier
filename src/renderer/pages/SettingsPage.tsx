import React, { useState, useEffect } from 'react';
import { useAppStore } from '../store/app-store';
import { DeviceCodeModal } from '../components/DeviceCodeModal';
import { ipc } from '../api/ipc-client';

export function SettingsPage(): React.ReactElement {
  const { tenants, settings, setSettings, deviceCodeInfo, setDeviceCodeInfo, removeTenant } = useAppStore();
  const [addingAccount, setAddingAccount] = useState(false);

  useEffect(() => {
    ipc.settings.get().then(setSettings).catch(console.error);
  }, []);

  async function handleAddAccount() {
    setAddingAccount(true);
    try {
      await ipc.auth.startDeviceCode();
    } catch (err) {
      console.error('Device code flow failed:', err);
    } finally {
      setDeviceCodeInfo(null);
      setAddingAccount(false);
    }
  }

  async function handleCancelDeviceCode() {
    await ipc.auth.cancelDeviceCode();
    setDeviceCodeInfo(null);
    setAddingAccount(false);
  }

  async function handleSignOut(tenantId: string) {
    await ipc.auth.signOutTenant(tenantId);
    removeTenant(tenantId);
  }

  async function updateSetting<K extends keyof typeof settings>(key: K, value: typeof settings[K]) {
    const updated = await ipc.settings.set({ [key]: value });
    setSettings(updated);
  }

  return (
    <div style={styles.container}>
      {deviceCodeInfo && (
        <DeviceCodeModal
          userCode={deviceCodeInfo.userCode}
          verificationUri={deviceCodeInfo.verificationUri}
          expiresIn={deviceCodeInfo.expiresIn}
          onCancel={handleCancelDeviceCode}
        />
      )}

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Accounts</h3>

        {tenants.length === 0 && (
          <p style={styles.emptyText}>No accounts added yet.</p>
        )}

        {tenants.map(tenant => (
          <div key={tenant.id} style={styles.tenantRow}>
            <div>
              <div style={styles.tenantName}>{tenant.displayName}</div>
              <div style={styles.tenantUpn}>{tenant.userPrincipalName}</div>
            </div>
            <button
              style={styles.signOutBtn}
              onClick={() => handleSignOut(tenant.id)}
            >
              Sign out
            </button>
          </div>
        ))}

        <div style={styles.addSection}>
          <button
            style={styles.addBtn}
            onClick={handleAddAccount}
            disabled={addingAccount}
          >
            {addingAccount ? 'Signing in…' : '+ Add Account'}
          </button>
        </div>
      </section>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Notifications</h3>

        <label style={styles.toggle}>
          <span>Enable notifications</span>
          <input
            type="checkbox"
            checked={settings.notificationsEnabled}
            onChange={e => updateSetting('notificationsEnabled', e.target.checked)}
          />
        </label>

        <label style={styles.toggle}>
          <span>Show message preview</span>
          <input
            type="checkbox"
            checked={settings.showMessagePreviewInNotification}
            onChange={e => updateSetting('showMessagePreviewInNotification', e.target.checked)}
          />
        </label>
      </section>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>Sync</h3>

        <div style={styles.row}>
          <span style={styles.label}>Poll interval</span>
          <select
            value={settings.pollIntervalSeconds}
            onChange={e => updateSetting('pollIntervalSeconds', Number(e.target.value))}
            style={styles.select}
          >
            <option value={15}>15 seconds</option>
            <option value={30}>30 seconds</option>
            <option value={60}>1 minute</option>
            <option value={300}>5 minutes</option>
          </select>
        </div>

        <label style={styles.toggle}>
          <span>Show hidden chats</span>
          <input
            type="checkbox"
            checked={settings.showHiddenChats}
            onChange={e => updateSetting('showHiddenChats', e.target.checked)}
          />
        </label>
      </section>

      <section style={styles.section}>
        <h3 style={styles.sectionTitle}>System</h3>
        <label style={styles.toggle}>
          <span>Launch at login</span>
          <input
            type="checkbox"
            checked={settings.launchAtLogin}
            onChange={e => updateSetting('launchAtLogin', e.target.checked)}
          />
        </label>
      </section>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '0 0 32px',
    overflowY: 'auto',
    height: '100%',
  },
  section: {
    padding: '16px 16px 8px',
    borderBottom: '1px solid #1e1e3a',
  },
  sectionTitle: {
    fontSize: '11px',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    color: '#606080',
    margin: '0 0 12px',
  },
  tenantRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '8px 0',
  },
  tenantName: {
    fontSize: '13px',
    fontWeight: 600,
    color: '#c0c8e0',
  },
  tenantUpn: {
    fontSize: '11px',
    color: '#606080',
  },
  signOutBtn: {
    background: 'none',
    border: '1px solid #3a3a6e',
    borderRadius: '4px',
    color: '#9090b0',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '4px 10px',
  },
  addSection: {
    marginTop: '12px',
  },
  addBtn: {
    backgroundColor: '#2a4a8e',
    border: 'none',
    borderRadius: '6px',
    color: '#e0e8ff',
    cursor: 'pointer',
    fontSize: '12px',
    padding: '6px 14px',
    fontWeight: 600,
  },
  toggle: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
    fontSize: '13px',
    color: '#a0a8c8',
    cursor: 'pointer',
  },
  row: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '6px 0',
  },
  label: {
    fontSize: '13px',
    color: '#a0a8c8',
  },
  select: {
    backgroundColor: '#0d0d20',
    border: '1px solid #2a2a4e',
    borderRadius: '4px',
    color: '#d0d8f0',
    fontSize: '12px',
    padding: '4px 8px',
  },
  emptyText: {
    fontSize: '12px',
    color: '#505070',
    margin: '0 0 12px',
  },
};
