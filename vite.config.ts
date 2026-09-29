/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so the build works both at the domain root and under
  // a GitHub Pages project path such as /Kompas/.
  base: './',
  build: {
    target: 'es2020',
  },
  test: {
    environment: 'jsdom',
    include: ['tests/unit/**/*.test.ts'],
  },
});
