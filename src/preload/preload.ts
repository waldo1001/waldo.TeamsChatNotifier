import { contextBridge, ipcRenderer } from 'electron';

// Expose a minimal, typed API to the renderer via contextBridge.
// This is the ONLY communication channel between renderer and main process.
// nodeIntegration is false — renderer has no direct Node.js access.

type IpcCallback = (...args: unknown[]) => void;

contextBridge.exposeInMainWorld('electronAPI', {
  /**
   * Invoke a handler in the main process (request/response).
   */
  invoke: (channel: string, payload?: unknown): Promise<unknown> => {
    return ipcRenderer.invoke(channel, payload);
  },

  /**
   * Subscribe to push events from the main process.
   * Returns an unsubscribe function — call it in useEffect cleanup.
   */
  on: (channel: string, callback: IpcCallback): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, ...args: unknown[]) =>
      callback(...args);
    ipcRenderer.on(channel, handler);
    return () => ipcRenderer.removeListener(channel, handler);
  },
});

// Type declaration merged into the renderer's Window interface via src/renderer/env.d.ts
