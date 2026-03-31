import '@testing-library/jest-dom';

// Mock the Electron preload API for component tests
Object.defineProperty(window, 'electronAPI', {
  value: {
    invoke: async () => undefined,
    on: () => () => {},
  },
  writable: true,
});
