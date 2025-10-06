import '@testing-library/jest-dom/vitest';
import { afterEach } from 'vitest';
import { cleanup } from '@testing-library/react';
import { configure } from '@testing-library/dom';

configure({
  getElementError: (message: string) => {
    const error = new Error(message);
    error.name = 'TestingLibraryAssertionError';
    return error;
  },
});

afterEach(() => {
  cleanup();
});

if (typeof window !== 'undefined' && !('ResizeObserver' in window)) {
  class ResizeObserverMock implements ResizeObserver {
    callback: ResizeObserverCallback;

    constructor(callback: ResizeObserverCallback) {
      this.callback = callback;
    }

    observe(): void {
      // noop para pruebas
    }

    unobserve(): void {
      // noop para pruebas
    }

    disconnect(): void {
      // noop para pruebas
    }
  }

  // @ts-expect-error: asignamos mock al window de pruebas
  window.ResizeObserver = ResizeObserverMock;
}
