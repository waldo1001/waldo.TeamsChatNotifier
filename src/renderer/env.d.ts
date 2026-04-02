/// <reference types="vite/client" />

declare const __APP_VERSION__: string;

interface Window {
  electronAPI: {
    invoke: (channel: string, payload?: unknown) => Promise<unknown>;
    on: (channel: string, callback: (...args: unknown[]) => void) => () => void;
  };
}
