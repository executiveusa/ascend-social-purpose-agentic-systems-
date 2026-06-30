import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['packages/**/*.test.js', 'packages/**/tests/**/*.js', 'services/**/tests/**/*.test.js'] } });
