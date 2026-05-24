import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js'],
    environmentMatchGlobs: [
      ['tests/storage.test.js', 'jsdom'],
      ['tests/ui/**', 'jsdom']
    ]
  }
});
