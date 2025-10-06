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

