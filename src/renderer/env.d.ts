/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    invoke: (channel: string, payload?: unknown) => Promise<unknown>;
    on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
  };
}
