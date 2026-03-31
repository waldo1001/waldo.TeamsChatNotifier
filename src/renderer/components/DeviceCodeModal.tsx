import React, { useState, useEffect } from 'react';

interface Props {
  userCode: string;
  verificationUri: string;
  expiresIn: number;  // seconds
  onCancel: () => void;
}

export function DeviceCodeModal({
  userCode,
  verificationUri,
  expiresIn,
  onCancel,
}: Props): React.ReactElement {
  const [remaining, setRemaining] = useState(expiresIn);
  const [copied, setCopied] = useState(false);

  // Auto-open the verification URL in the default browser on mount
  useEffect(() => {
    window.electronAPI.invoke('chats:open-in-teams', { webUrl: verificationUri }).catch(() => {
      // Fallback: user can click the link manually
    });
  }, [verificationUri]);

  useEffect(() => {
    if (remaining <= 0) return;
    const timer = setInterval(() => setRemaining(r => r - 1), 1000);
    return () => clearInterval(timer);
  }, [remaining]);

  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const timeDisplay = `${minutes}:${String(seconds).padStart(2, '0')}`;

  function handleCopyCode() {
    navigator.clipboard.writeText(userCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {});
  }

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h2 style={styles.title}>Sign in to Microsoft</h2>

        <p style={styles.instructions}>
          A browser window has opened. Enter this code to sign in:
        </p>

        <div style={styles.code} onClick={handleCopyCode} title="Click to copy">
          {userCode}
        </div>

        <p style={styles.hint}>
          {copied ? 'Copied!' : 'Click the code to copy it'}
        </p>

        <p style={styles.hint}>
          Waiting for you to complete sign-in…
        </p>

        <div data-testid="expiry-timer" style={styles.timer}>
          Code expires in {timeDisplay}
        </div>

        <button style={styles.cancelBtn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    backgroundColor: 'rgba(0,0,0,0.7)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#1a1a2e',
    border: '1px solid #2d2d6e',
    borderRadius: '8px',
    padding: '28px 32px',
    width: '340px',
    textAlign: 'center',
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#e0e8ff',
    marginBottom: '16px',
    marginTop: 0,
  },
  instructions: {
    fontSize: '13px',
    color: '#9090b0',
    margin: '8px 0',
  },
  url: {
    backgroundColor: '#0d0d1e',
    border: '1px solid #3a3a6e',
    borderRadius: '4px',
    padding: '8px 12px',
    fontSize: '12px',
    color: '#6c9fe8',
    wordBreak: 'break-all',
    marginBottom: '12px',
  },
  code: {
    fontSize: '28px',
    fontWeight: 700,
    letterSpacing: '4px',
    color: '#e8f0ff',
    backgroundColor: '#0d0d20',
    padding: '12px',
    borderRadius: '6px',
    fontFamily: 'monospace',
    margin: '8px 0 16px',
  },
  hint: {
    fontSize: '12px',
    color: '#606080',
    margin: '8px 0',
  },
  timer: {
    fontSize: '12px',
    color: '#8080a0',
    marginBottom: '20px',
  },
  cancelBtn: {
    backgroundColor: 'transparent',
    border: '1px solid #3a3a6e',
    borderRadius: '6px',
    color: '#9090b0',
    cursor: 'pointer',
    fontSize: '13px',
    padding: '8px 24px',
  },
};
