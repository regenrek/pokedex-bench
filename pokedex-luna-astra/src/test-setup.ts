/// <reference types="vitest/jsdom" />
import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';

// Node can expose an unavailable localStorage global that Vitest preserves.
// Use this test environment's actual browser storage, isolated from Node storage.
Object.defineProperty(globalThis, 'localStorage', {
  configurable: true,
  value: jsdom.window.localStorage,
});

afterEach(() => { cleanup(); localStorage.clear(); });
